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

  // 3. Load settings (this also populates window.siteSettings)
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
      }
    } else {
      console.error('[App] CRITICAL: Failed to load settings from Google Apps Script.');
      console.error('Error:', settingsRes.error);
      showApiErrorBanner(settingsRes.error);
      // Continue with defaults
    }
  }

  // Update site name in logo if provided
  const logoLink = document.getElementById('logo-link');
  if (logoLink && settings.site_name) {
    const logoText = logoLink.querySelector('.logo-text');
    if (logoText) logoText.textContent = settings.site_name;
  }

  // 4. Render menu (non-blocking).
  // Menu is header UI only. Do not await it — we must render primary content
  // (#page-content) even if the menu API call is slow or fails.
  if (window.Menu) {
    // Fire-and-forget; the implementation shows a static fallback immediately
    // and updates the nav when the real data arrives.
    Menu.render(currentLang);
  }

  // 5. Render language switcher
  if (window.I18n) {
    I18n.renderLanguageSwitcher('language-switcher');
  }

  // 6. Set footer year
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 7. Route dispatcher
  async function dispatchRoute() {
    const info = (window.Router && Router.getCurrentRoute)
      ? Router.getCurrentRoute()
      : { language: 'en', route: '/' };

    currentLang = info.language || 'en';

    // Update i18n current language
    if (window.I18n) {
      I18n.setCurrentLanguage(currentLang);
      I18n.renderLanguageSwitcher('language-switcher');
    }

    // Re-render menu for new language (non-blocking; menu.js shows fallback immediately)
    if (window.Menu) {
      Menu.render(currentLang);
    }

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
        News.setLanguage(currentLang);
        await News.renderList();
      }
      return;
    }

    // News detail: /news/slug or /news/123
    const newsMatch = route.match(/^\/news\/(.+)$/);
    if (newsMatch) {
      const slugOrId = newsMatch[1];
      if (window.News) {
        News.setLanguage(currentLang);
        await News.renderDetail(slugOrId);
      }
      return;
    }

    // Dynamic pages from Sheets (about, contacts, services, etc.)
    // We treat any other route as a potential page slug
    const pageSlug = route.replace(/^\//, ''); // "about", "contacts"
    if (pageSlug && !pageSlug.includes('/')) {
      if (window.Pages) {
        Pages.setLanguage(currentLang);
        await Pages.renderPage(pageSlug);
      }
      return;
    }

    // Unknown route → 404 style message
    pageContent.innerHTML = `
      <div class="error">
        <h2>Page not found</h2>
        <p>The page you are looking for does not exist.</p>
        <p><a href="/">Return to homepage</a></p>
      </div>
    `;
  }

  async function renderHome() {
    if (!pageContent) return;

    const siteName = settings.site_name || 'Trust Site';
    const homeDesc = settings.home_description || `Welcome to ${siteName} — multilingual content powered by Google Sheets.`;

    // SEO meta for homepage
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
          <a href="${i18n ? i18n.localizedUrl('/news', currentLang) : '/news'}" class="btn" style="background:#0a66c2;color:white;padding:0.6rem 1.2rem;border-radius:9999px;text-decoration:none;">Browse News</a>
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


  // Initial route
  await dispatchRoute();

  // Handle browser back/forward
  window.addEventListener('popstate', async () => {
    await dispatchRoute();
  });

  // Optional: expose a global for debugging
  window.TrustSite = {
    reloadMenu: () => Menu.render(currentLang),
    getSettings: () => settings,
    navigate: (route, lang) => Router.navigate(route, lang || currentLang)
  };

  // Log ready state (useful during development)
  console.log('%c[TrustSite] Application initialized', 'color:#64748b');
})();
