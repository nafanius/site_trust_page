/**
 * Google Apps Script Web App — JSON API for multilingual static site.
 *
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CRITICAL: CORS + Deployment Rules                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║  1. After ANY change to this file, you MUST create a **NEW deployment**      ║
 * ║     (not just "Deploy" → update existing).                                   ║
 * ║  2. Go to Deploy → New deployment → Web app → Deploy                         ║
 * ║  3. Copy the NEW URL and paste it into js/config.js                          ║
 * ║                                                                              ║
 * ║  Google Apps Script is very strict with CORS. Headers only take effect      ║
 * ║  on a fresh deployment.                                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * Deploy settings:
 *   - Execute as: Me
 *   - Who has access: Anyone (or "Anyone, even anonymous")
 *
 * Supported actions:
 *   ?action=settings
 *   ?action=news&lang=ru
 *   ?action=news&id=1&lang=ru
 *   ?action=news&slug=new-website&lang=ru
 *   ?action=page&slug=about&lang=ru
 *   ?action=menu&lang=ru
 *
 * Response format:
 *   { "success": true, "data": ... }
 *   { "success": false, "error": "message" }
 */

const SHEET_NAMES = {
  SETTINGS: 'settings',
  MENU: 'menu',
  MENU_TRANSLATIONS: 'menu_translations',
  NEWS: 'news',
  NEWS_TRANSLATIONS: 'news_translations',
  PAGES: 'pages',
  PAGE_TRANSLATIONS: 'page_translations',
  CATEGORIES: 'categories',
  CATEGORY_TRANSLATIONS: 'category_translations'
};

const CACHE_TTL_SECONDS = 1; // 6 hours — content changes infrequently, good for performance on GitHub Pages
const SPREADSHEET_ID = 
/**
 * Main entry point for GET requests.
 */
function doGet(e) {
  const params = e.parameter || {};
  const action = (params.action || '').toLowerCase().trim();
  const callback = params.callback; // For JSONP fallback (bypasses CORS)

  try {
    let result;

    switch (action) {
      case 'settings':
        result = getSettings();
        break;

      case 'news': {
        const lang = params.lang || 'en';
        if (params.id) {
          result = getNewsById(params.id, lang);
        } else if (params.slug) {
          result = getNewsBySlug(params.slug, lang);
        } else {
          result = getNews(lang);
        }
        break;
      }

      case 'page': {
        const lang = params.lang || 'en';
        const slug = params.slug || '';
        result = getPage(slug, lang);
        break;
      }

      case 'menu': {
        const lang = params.lang || 'en';
        result = getMenu(lang);
        break;
      }

      default:
        return jsonResponse(null, 'Unknown action. Supported: settings, news, page, menu');
    }

    // Support JSONP callback (very useful during localhost development)
    if (callback) {
      const jsonp = `${callback}(${JSON.stringify({ success: true, data: result })})`;
      const output = ContentService.createTextOutput(jsonp);
      output.setMimeType(ContentService.MimeType.JAVASCRIPT);
      return output;
    }

    return jsonResponse(result);

  } catch (err) {
    const errorPayload = { success: false, error: 'Server error: ' + err.message };

    if (callback) {
      const output = ContentService.createTextOutput(`${callback}(${JSON.stringify(errorPayload)})`);
      output.setMimeType(ContentService.MimeType.JAVASCRIPT);
      return output;
    }

    return jsonResponse(null, 'Server error: ' + err.message);
  }
}

/**
 * Return JSON response.
 *
 * NOTE on CORS:
 * Calling setHeaders() on ContentService TextOutput often throws
 * "setHeaders is not a function" in Web Apps (as seen in production).
 * We deliberately avoid it here to prevent the entire doGet from crashing.
 *
 * Reliable cross-origin access is provided by:
 *   - The JSONP path (?callback=...)  ← used automatically by the frontend on localhost and as fallback
 *   - Proper "Anyone" access on the Web App deployment
 *
 * After editing this file you MUST "Deploy → New deployment".
 */
function jsonResponse(data, errorMessage) {
  const payload = errorMessage
    ? { success: false, error: errorMessage }
    : { success: true, data: data };

  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  // Intentionally do NOT call setHeaders() — it crashes many deployments.
  return output;
}

/**
 * Alternative JSON response using HtmlService.
 * This method is sometimes more reliable for CORS when called from browsers.
 * We return JSON inside a minimal HTML document.
 *
 * Use this if the normal jsonResponse still gives CORS errors after redeploy.
 */
function jsonResponseHtml(data, errorMessage) {
  const payload = errorMessage
    ? { success: false, error: errorMessage }
    : { success: true, data: data };

  const json = JSON.stringify(payload);

  // Return as text/html but the client will parse it as JSON
  const output = HtmlService.createHtmlOutput(json);
  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  // We can't set custom headers easily here, but this often bypasses some restrictions
  return output;
}

/**
 * Handle preflight (OPTIONS) requests.
 * We return a minimal response. setHeaders() is avoided because it often throws
 * "setHeaders is not a function" in Web App executions.
 */
function doOptions(e) {
  const output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  return output;
}

/**
 * Convert a sheet to array of objects using header row.
 */
function sheetToObjects(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 1) return [];

  const headers = values[0].map(h => String(h).trim());
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    let hasData = false;

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      const val = row[j];
      obj[key] = (val === '' || val === null || val === undefined) ? '' : val;
      if (obj[key] !== '') hasData = true;
    }

    // Skip completely empty rows
    if (hasData) {
      rows.push(obj);
    }
  }

  return rows;
}

/**
 * Get settings as a simple key-value object.
 */
function getSettings() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('settings');
  if (cached) {
    return JSON.parse(cached);
  }

  const rows = sheetToObjects(SHEET_NAMES.SETTINGS);
  const settings = {};

  rows.forEach(row => {
    const key = String(row.key || '').trim();
    if (key) {
      settings[key] = row.value;
    }
  });

  // Provide sensible defaults
  if (!settings.default_language) settings.default_language = 'en';
  if (!settings.fallback_language) settings.fallback_language = settings.default_language || 'en';
  if (!settings.available_languages) settings.available_languages = 'en,ru,pl';
  if (!settings.news_per_page) settings.news_per_page = '12';
  if (!settings.site_name) settings.site_name = 'Trust Site';

  cache.put('settings', JSON.stringify(settings), CACHE_TTL_SECONDS);
  return settings;
}

/**
 * Get all active news items with translation for the requested language.
 * Falls back to fallback_language when translation is missing.
 */
function getNews(lang = 'en') {
  const cacheKey = 'news_' + lang;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const settings = getSettings();
  const fallback = settings.fallback_language || 'en';

  const newsRows = sheetToObjects(SHEET_NAMES.NEWS);
  const transRows = sheetToObjects(SHEET_NAMES.NEWS_TRANSLATIONS);

  // Build translation lookup: news_id -> { lang: {title, text, button} }
  const transMap = {};
  transRows.forEach(t => {
    const nid = String(t.news_id || '').trim();
    const l = String(t.lang || '').toLowerCase().trim();
    if (!nid || !l) return;
    if (!transMap[nid]) transMap[nid] = {};
    transMap[nid][l] = {
      title: t.title || '',
      text: t.text || '',
      button: t.button || ''
    };
  });

  const result = [];

  newsRows.forEach(n => {
    const active = String(n.active).toUpperCase() === 'TRUE' || n.active === true || n.active === 1;
    if (!active) return;

    const nid = String(n.id || '').trim();
    if (!nid) return;

    const requested = pickTranslation(transMap[nid], lang, fallback);

    result.push({
      id: Number(n.id) || nid,
      slug: n.slug || '',
      date: n.date || '',
      category: n.category || '',
      image: n.image || '',
      link: n.link || '',
      title: requested.title,
      text: requested.text,
      button: requested.button,
      // Include language metadata for debugging / advanced use
      _meta: {
        requestedLanguage: lang,
        language: requested.language,
        fallback: requested.fallback
      }
    });
  });

  // Sort by sort (desc) then date (desc)
  result.sort((a, b) => {
    const sa = Number(newsRows.find(r => String(r.id) === String(a.id))?.sort) || 0;
    const sb = Number(newsRows.find(r => String(r.id) === String(b.id))?.sort) || 0;
    if (sb !== sa) return sb - sa;
    return (b.date || '').localeCompare(a.date || '');
  });

  cache.put(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
  return result;
}

function getNewsById(id, lang = 'en') {
  const all = getNews(lang);
  const found = all.find(item => String(item.id) === String(id));
  return found || null;
}

function getNewsBySlug(slug, lang = 'en') {
  const all = getNews(lang);
  const found = all.find(item => item.slug === slug);
  return found || null;
}

/**
 * Get a page by slug with translation.
 */
function getPage(slug, lang = 'en') {
  if (!slug) {
    return null;
  }

  const cacheKey = 'page_' + slug + '_' + lang;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const settings = getSettings();
  const fallback = settings.fallback_language || 'en';

  const pageRows = sheetToObjects(SHEET_NAMES.PAGES);
  const transRows = sheetToObjects(SHEET_NAMES.PAGE_TRANSLATIONS);

  const transMap = {};
  transRows.forEach(t => {
    const pid = String(t.page_id || '').trim();
    const l = String(t.lang || '').toLowerCase().trim();
    if (!pid || !l) return;
    if (!transMap[pid]) transMap[pid] = {};
    // Capture ALL columns from the translation row (except identifiers) so that
    // admins can add arbitrary translatable fields (subtitle, lead, info_title, contact_email, etc.)
    // without changing backend code.
    const transObj = {};
    Object.keys(t).forEach(k => {
      const key = String(k).trim();
      const lower = key.toLowerCase();
      if (lower === 'page_id' || lower === 'lang') return;
      transObj[key] = (t[k] === '' || t[k] === null || t[k] === undefined) ? '' : t[k];
    });
    transMap[pid][l] = transObj;
  });

  const pageRow = pageRows.find(p => {
    const active = String(p.active).toUpperCase() === 'TRUE' || p.active === true || p.active === 1;
    return active && String(p.slug || '').trim() === slug.trim();
  });

  if (!pageRow) {
    return null;
  }

  const pid = String(pageRow.id || '').trim();
  const requested = pickTranslation(transMap[pid], lang, fallback);

  // requested may now contain many keys (title, content, subtitle, lead, contact_email, etc.)
  // We keep explicit top-level fields for backward compatibility with existing templates.
  const result = {
    id: Number(pageRow.id) || pid,
    slug: pageRow.slug || slug,
    template: pageRow.template || 'standard',
    image: pageRow.image || '',
    title: requested.title || requested.Title || '',
    content: requested.content || requested.Content || '',
    // SEO-friendly fields (optional columns in "pages" sheet)
    meta_description: pageRow.meta_description || '',
    og_image: pageRow.og_image || pageRow.image || '',
    // Pass through ALL translation fields so templates can use rich translatable data
    // e.g. page.subtitle, page.lead, page.contact_email, page.address, page.info_title etc.
    ...requested,
    _meta: {
      requestedLanguage: lang,
      language: requested.language || lang,
      fallback: requested.fallback || false
    }
  };

  cache.put(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
  return result;
}

/**
 * Get menu structure with translations.
 * Supports parent_id for dropdowns / nested items.
 */
function getMenu(lang = 'en') {
  const cacheKey = 'menu_' + lang;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const settings = getSettings();
  const fallback = settings.fallback_language || 'en';

  const menuRows = sheetToObjects(SHEET_NAMES.MENU);
  const transRows = sheetToObjects(SHEET_NAMES.MENU_TRANSLATIONS);

  const transMap = {};
  transRows.forEach(t => {
    const mid = String(t.menu_id || '').trim();
    const l = String(t.lang || '').toLowerCase().trim();
    if (!mid || !l) return;
    if (!transMap[mid]) transMap[mid] = {};
    transMap[mid][l] = t.title || '';
  });

  // Filter active items
  const activeItems = menuRows.filter(m => {
    const active = String(m.active).toUpperCase() === 'TRUE' || m.active === true || m.active === 1;
    return active;
  });

  // Build tree
  const itemsById = {};
  activeItems.forEach(m => {
    const mid = String(m.id || '').trim();
    const title = pickSimpleTranslation(transMap[mid], lang, fallback);
    itemsById[mid] = {
      id: Number(m.id) || mid,
      parent_id: m.parent_id ? Number(m.parent_id) : 0,
      type: m.type || 'page',
      url: m.url || '#',
      sort: Number(m.sort) || 0,
      title: title,
      children: []
    };
  });

  const rootItems = [];

  Object.keys(itemsById).forEach(id => {
    const item = itemsById[id];
    const parentId = String(item.parent_id || 0);
    if (parentId === '0' || !itemsById[parentId]) {
      rootItems.push(item);
    } else {
      itemsById[parentId].children.push(item);
    }
  });

  // Sort each level
  function sortLevel(arr) {
    arr.sort((a, b) => a.sort - b.sort);
    arr.forEach(it => {
      if (it.children && it.children.length > 0) {
        sortLevel(it.children);
      }
    });
  }
  sortLevel(rootItems);

  cache.put(cacheKey, JSON.stringify(rootItems), CACHE_TTL_SECONDS);
  return rootItems;
}

/**
 * Pick best translation for news/page style objects.
 */
function pickTranslation(translationsForId, requestedLang, fallbackLang) {
  if (!translationsForId) {
    return { title: '', text: '', content: '', button: '', language: fallbackLang, fallback: true };
  }

  const req = String(requestedLang || '').toLowerCase();
  const fb = String(fallbackLang || 'en').toLowerCase();

  if (translationsForId[req]) {
    return {
      ...translationsForId[req],
      language: req,
      fallback: false
    };
  }

  if (translationsForId[fb]) {
    return {
      ...translationsForId[fb],
      language: fb,
      fallback: true
    };
  }

  // Last resort: any available language
  const anyLang = Object.keys(translationsForId)[0];
  if (anyLang) {
    return {
      ...translationsForId[anyLang],
      language: anyLang,
      fallback: true
    };
  }

  return { title: '', text: '', content: '', button: '', language: fb, fallback: true };
}

/**
 * Simpler version for menu (only title).
 */
function pickSimpleTranslation(translationsForId, requestedLang, fallbackLang) {
  if (!translationsForId) return '';
  const req = String(requestedLang || '').toLowerCase();
  const fb = String(fallbackLang || 'en').toLowerCase();

  if (translationsForId[req]) return translationsForId[req];
  if (translationsForId[fb]) return translationsForId[fb];
  const any = Object.values(translationsForId)[0];
  return any || '';
}

/**
 * Optional: force clear cache (useful during development).
 * Call manually from Apps Script editor if needed.
 */
function clearCache() {
  CacheService.getScriptCache().removeAll([
    'settings',
    'news_en', 'news_ru', 'news_pl',
    'menu_en', 'menu_ru', 'menu_pl'
  ]);
  // Pages and news items are cached per-slug/id, so a full clear is safer in dev
  // For production you can leave it or implement more granular invalidation.
}
