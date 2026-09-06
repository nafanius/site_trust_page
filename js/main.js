/**
 * main.js
 * Application bootstrap and route dispatcher.
 *
 * Responsibilities:
 * - Initialize language from route
 * - Load settings
 * - Render menu + language switcher
 * - Dispatch routes to the correct view (home, news list, news detail, pages)
 * - Handle popstate for back/forward
 */

(async function initApp() {
  const pageContent = document.getElementById('page-content');

  // 1. Determine current route (supports 404.html redirectPath)
  const routeInfo = (window.Router && Router.getCurrentRoute)
    ? Router.getCurrentRoute()
    : { language: 'en', route: '/' };

  // 2. Initialize i18n language
  if (window.I18n) {
    I18n.initFromRoute(routeInfo);
  }
  let currentLang = (window.I18n && I18n.getCurrentLanguage()) || routeInfo.language || 'en';
  let lastLang = currentLang;

  // 3. Load settings (this also populates window.siteSettings)
  // Settings are loaded ONLY once at bootstrap. They are not re-fetched on navigation.
  let settings = {};
  if (window.API) {
    console.log('[App] Loading settings from API...');
    const settingsRes = await API.settings();
    console.log('[App] Settings response:', settingsRes);

    if (settingsRes.success && settingsRes.data) {
      settings = settingsRes.data;
      if (window.I18n && typeof I18n.configureFromSettings === 'function') {
        I18n.configureFromSettings(settings);
        currentLang = I18n.getCurrentLanguage();
        lastLang = currentLang;
      }
    } else {
      console.error('[App] CRITICAL: Failed to load settings from Google Apps Script.');
      console.error('Error:', settingsRes.error);
      showApiErrorBanner(settingsRes.error);
      // Continue with defaults
    }
  }

  // Update site name in logo if provided.
  // Set logo href to current language home so clicks never switch language.
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    if (window.Router && typeof Router.buildUrl === 'function') {
      logoLink.setAttribute('href', Router.buildUrl('/', currentLang));
    }
    if (settings.site_name) {
      const logoText = logoLink.querySelector('.logo-text');
      if (logoText) logoText.textContent = settings.site_name;
    }
    // Ensure clicking the logo always goes to home of the CURRENT language (never switches lang)
    logoLink.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (window.Router && typeof Router.navigate === 'function') {
        Router.navigate('/', currentLang);
      } else {
        // Fallback
        const target = (window.Router && Router.buildUrl) ? Router.buildUrl('/', currentLang) : '/';
        window.location.href = target;
      }
    });
  }

  // 4. Render menu for initial language (full render + API call happens here)
  if (window.Menu) {
    Menu.render(currentLang);
  }

  // 5. Render language switcher (initial)
  if (window.I18n) {
    I18n.renderLanguageSwitcher('language-switcher');
  }

  // 6. Set footer year
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /**
   * Render ONLY the main content area for the given route.
   * This is called on every navigation (same lang or lang change).
   * The heavy lifting (menu, switcher, cache clear) is done only on language change.
   */
  async function renderContentForRoute(info, lang) {
    if (!pageContent) return;

    const route = info.route || '/';

    // Home
    if (route === '/' || route === '') {
      await renderHome();
      if (window.I18n && typeof I18n.setDocumentTitle === 'function') {
        I18n.setDocumentTitle('');
      }
      return;
    }

    // News list
    if (route === '/news') {
      if (window.News) {
        News.setLanguage(lang);
        await News.renderList();
      }
      return;
    }

    // News detail: /news/slug or /news/123
    const newsMatch = route.match(/^\/news\/(.+)$/);
    if (newsMatch) {
      const slugOrId = newsMatch[1];
      if (window.News) {
        News.setLanguage(lang);
        await News.renderDetail(slugOrId);
      }
      return;
    }

    // Dynamic pages from Sheets (about, contacts, services, etc.)
    const pageSlug = route.replace(/^\//, '');
    if (pageSlug && !pageSlug.includes('/')) {
      if (window.Pages) {
        Pages.setLanguage(lang);
        await Pages.renderPage(pageSlug);
      }
      return;
    }

    // Unknown route → 404 style message
    pageContent.innerHTML = `
      <div class="error">
        <h2>Page not found</h2>
        <p>The page you are looking for does not exist.</p>
        <p><a href="${(window.Router && Router.buildUrl) ? Router.buildUrl('/', 'en') : '/'}">Return to homepage</a></p>
      </div>
    `;
  }

  /**
   * Smart navigation handler.
   * - On language change: clear API cache, fully re-render menu + language switcher, then content.
   * - On same-language navigation: only update the page content + lightweight menu active state.
   * This prevents re-fetching "everything" and full page redraws on every link click.
   */
  async function handleNavigation() {
    const info = (window.Router && Router.getCurrentRoute)
      ? Router.getCurrentRoute()
      : { language: 'en', route: '/' };

    const newLang = info.language || 'en';
    const route = info.route || '/';

    const langChanged = newLang !== lastLang;

    // Always keep currentLang in sync for closures used by renderHome etc.
    currentLang = newLang;

    if (langChanged) {
      console.log('[App] Language changed from', lastLang, 'to', newLang, '— performing full re-render + cache clear');
      if (window.API && typeof API.clearCache === 'function') {
        API.clearCache();
      }

      lastLang = newLang;

      if (window.I18n) {
        I18n.setCurrentLanguage(newLang);
        I18n.renderLanguageSwitcher('language-switcher');
      }

      if (window.Menu) {
        // Full menu re-render (fetches new language data)
        Menu.render(newLang);
      }

      // Keep logo pointing to the home of the new language
      const logo = document.getElementById('logo-link');
      if (logo && window.Router && typeof Router.buildUrl === 'function') {
        logo.setAttribute('href', Router.buildUrl('/', newLang));
      }
    } else {
      // Same language: minimal work
      if (window.Menu && typeof Menu.updateActiveState === 'function') {
        Menu.updateActiveState(route);
      }
      // Do not touch language switcher or re-fetch menu
    }

    // Always render (or replace) only the main content area
    await renderContentForRoute(info, newLang);
  }

  // Expose for debugging
  window.TrustSite = window.TrustSite || {};
  window.TrustSite.handleNavigation = handleNavigation;
  window.TrustSite.getCurrentLang = () => currentLang;
  window.TrustSite.clearApiCache = () => { if (window.API && API.clearCache) API.clearCache(); };

  // Initial route
  await handleNavigation();

  // Handle browser back/forward
  window.addEventListener('popstate', async () => {
    await handleNavigation();
  });

  /**
   * Intercept clicks on internal links to enable SPA-like navigation.
   * This prevents full page reloads (and 404.html roundtrips on GitHub Pages)
   * when navigating within the same language.
   * Language changes are still detected inside handleNavigation.
   */
  function setupInternalLinkInterception() {
    document.addEventListener('click', (e) => {
      // Ignore modified clicks (open in new tab, etc.)
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const a = e.target.closest('a[href]');
      if (!a) return;

      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      // External protocols
      if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      if (a.target && a.target.toLowerCase() === '_blank') return;

      // Resolve against current origin
      let targetUrl;
      try {
        targetUrl = new URL(href, window.location.origin);
      } catch (_) {
        return; // malformed
      }

      if (targetUrl.origin !== window.location.origin) return;

      // Parse with our router to see if it's an app route
      const parsed = (window.Router && typeof Router.parsePath === 'function')
        ? Router.parsePath(targetUrl.pathname)
        : null;

      if (!parsed) return;

      // It's one of our routes — handle with SPA navigation
      e.preventDefault();

      const targetPath = targetUrl.pathname + targetUrl.search + targetUrl.hash;

      if (window.Router && typeof Router.navigate === 'function') {
        // Router.navigate will pushState + fire popstate → handleNavigation
        Router.navigate(parsed.route, parsed.language);
      } else {
        // Fallback
        history.pushState({}, '', targetPath);
        window.dispatchEvent(new Event('popstate'));
      }
    }, { capture: true });
  }

  setupInternalLinkInterception();

  async function renderHome() {
    if (!pageContent) return;

    const siteName = settings.site_name || 'Trust Site';

    // Try to load homepage content from Google Sheets (slug = "home")
    // This allows the main page to be fully managed from the CMS like any other page.
    let homePage = null;
    if (window.API) {
      try {
        const res = await API.page('home', currentLang);
        if (res && res.success && res.data) {
          homePage = res.data;
        }
      } catch (e) {
        // ignore — fall back to settings/default
      }
    }

    if (homePage && homePage.title) {
      // Render using page content from sheet (standard layout)
      const imgHtml = homePage.image
        ? `<img src="${escapeHtml(homePage.image)}" alt="${escapeHtml(homePage.title)}" style="max-height:380px;width:100%;object-fit:cover;border-radius:8px;margin:1.5rem 0;">`
        : '';

      const body = (homePage.content || '')
        .split(/\n{2,}/)
        .map(block => {
          const safe = escapeHtml(block).replace(/\n/g, '<br>');
          return `<p>${safe}</p>`;
        })
        .join('');

      // SEO
      document.title = homePage.title;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      const desc = homePage.meta_description || homePage.title || '';
      metaDesc.setAttribute('content', escapeHtml(desc).slice(0, 160));

      pageContent.innerHTML = `
        <article class="page-template standard">
          <header class="page-header">
            <h1>${escapeHtml(homePage.title)}</h1>
          </header>
          <div class="page-content">
            ${imgHtml}
            <div class="page-body">
              ${body || '<p></p>'}
            </div>
          </div>
        </article>
      `;
      return;
    }

    // Fallback: use settings or minimal default (backward compatible)
    const homeDesc = settings.home_description || `Welcome to ${siteName} — multilingual content powered by Google Sheets.`;

    setHomeMeta(siteName, homeDesc);

    const i18n = window.I18n;
    pageContent.innerHTML = `
      <div class="page-header">
        <h1>Welcome to ${escapeHtml(siteName)}</h1>
      </div>
      <div class="page-content">
        <p>${escapeHtml(homeDesc)}</p>
        <p>Use the navigation above to explore News and other pages.</p>
        <p style="margin-top:2rem;">
          <a href="${i18n ? i18n.localizedUrl('/news', currentLang) : ((window.Router && Router.buildUrl) ? Router.buildUrl('/news', currentLang) : '/news')}" class="btn" style="background:#0a66c2;color:white;padding:0.6rem 1.2rem;border-radius:9999px;text-decoration:none;">Browse News</a>
        </p>
      </div>
    `;
  }

  function setHomeMeta(siteName, description) {
    document.title = siteName;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description.slice(0, 160));

    // Update OG tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', siteName);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description.slice(0, 200));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Show a visible error banner when the Google Apps Script API cannot be reached.
   * This is very common due to adblockers blocking script.google.com.
   */
  function showApiErrorBanner(errorMsg) {
    const container = document.getElementById('page-content');
    if (!container) return;

    const banner = document.createElement('div');
    banner.style.cssText = 'background:#fee2e2;border:1px solid #ef4444;color:#991b1b;padding:12px 16px;margin:12px 0;border-radius:8px;font-family:sans-serif;';
    banner.innerHTML = `
      <strong>⚠️ Не удалось загрузить данные с Google Apps Script</strong><br>
      <small>Ошибка: ${escapeHtml(errorMsg || 'JSONP request failed')}</small>
      <br><br>
      <strong>Что делать:</strong><br>
      1. Откройте консоль (F12) — там будет красная ссылка с полным URL.<br>
      2. Скопируйте этот URL и откройте его в <strong>новой вкладке</strong> (или в режиме инкогнито).<br>
      3. Если в новой вкладке вы видите текст вида <code>jsonp_cb_...({"success":true,...})</code> — проблема в блокировщике рекламы / расширениях браузера.<br>
      <br>
      <strong>Частые виновники:</strong> uBlock Origin, AdBlock, Brave Shields, Firefox Tracking Protection, расширения приватности.
    `;
    container.prepend(banner);
  }

  // Expose for debugging
  window.showApiErrorBanner = showApiErrorBanner;

  // Log ready state (useful during development)
  console.log('%c[TrustSite] Application initialized (optimized navigation)', 'color:#64748b');
})();
