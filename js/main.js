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
    const settingsRes = await API.settings();
    if (settingsRes.success && settingsRes.data) {
      settings = settingsRes.data;
      if (window.I18n && typeof I18n.configureFromSettings === 'function') {
        I18n.configureFromSettings(settings);
        // Re-sync language in case settings changed available languages
        currentLang = I18n.getCurrentLanguage();
      }
    }
  }

  // Update site name in logo if provided
  const logoLink = document.getElementById('logo-link');
  if (logoLink && settings.site_name) {
    const logoText = logoLink.querySelector('.logo-text');
    if (logoText) logoText.textContent = settings.site_name;
  }

  // 4. Render menu (async)
  if (window.Menu) {
    await Menu.render(currentLang);
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

    // Re-render menu for new language (cheap because of cache)
    if (window.Menu) {
      await Menu.render(currentLang);
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

    pageContent.innerHTML = `
      <div class="page-header">
        <h1>Welcome to ${escapeHtml(settings.site_name || 'Trust Site')}</h1>
      </div>
      <div class="page-content">
        <p>This is a multilingual static website powered by Google Sheets as a CMS.</p>
        <p>Use the navigation above to explore News and other pages.</p>
        <p style="margin-top:2rem;">
          <a href="${I18n ? I18n.localizedUrl('/news', currentLang) : '/news'}" class="btn" style="background:#0a66c2;color:white;padding:0.6rem 1.2rem;border-radius:9999px;text-decoration:none;">Browse News</a>
        </p>
      </div>
    `;
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
