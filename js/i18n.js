/**
 * i18n.js
 * Language handling, localized URL generation, and language switcher.
 *
 * Depends on:
 *   - Router (for buildUrl and navigation)
 *   - CONFIG (for fallback)
 */

const I18n = (() => {
  let currentLanguage = 'en';
  let availableLanguages = ['en', 'ru', 'pl'];
  let fallbackLanguage = 'en';
  let languageNames = {
    en: 'English',
    ru: 'Русский',
    pl: 'Polski'
  };

  /**
   * Update language configuration from settings API response.
   * Expected settings may contain:
   *   available_languages: "en,ru,pl"
   *   fallback_language: "en"
   */
  function configureFromSettings(settings = {}) {
    if (settings.available_languages) {
      const langs = String(settings.available_languages)
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      if (langs.length > 0) {
        availableLanguages = langs;
        if (window.Router && typeof Router.setSupportedLanguages === 'function') {
          Router.setSupportedLanguages(langs);
        }
      }
    }
    if (settings.fallback_language) {
      fallbackLanguage = String(settings.fallback_language).toLowerCase();
    }
    if (settings.default_language) {
      // default_language is used as initial preference when no route language is present
    }
  }

  function getCurrentLanguage() {
    return currentLanguage;
  }

  function getAvailableLanguages() {
    return [...availableLanguages];
  }

  function getFallbackLanguage() {
    return fallbackLanguage;
  }

  function setCurrentLanguage(lang) {
    const normalized = (lang || 'en').toLowerCase();
    if (availableLanguages.includes(normalized)) {
      currentLanguage = normalized;
    } else {
      currentLanguage = fallbackLanguage;
    }
    // Update <html lang="...">
    document.documentElement.lang = currentLanguage;
    return currentLanguage;
  }

  /**
   * Generate a localized URL for a logical path.
   * Examples:
   *   localizedUrl("/news", "ru") → "/ru/news"
   *   localizedUrl("/about", "en") → "/about"
   */
  function localizedUrl(path, language) {
    const lang = language || currentLanguage || 'en';
    if (window.Router && typeof Router.buildUrl === 'function') {
      return Router.buildUrl(path, lang);
    }
    // Fallback implementation
    const clean = path && path.startsWith('/') ? path : '/' + (path || '');
    if (lang === 'en' || !availableLanguages.includes(lang)) {
      return clean === '/' ? '/' : clean;
    }
    return clean === '/' ? `/${lang}/` : `/${lang}${clean}`;
  }

  /**
   * Get the language name for display.
   */
  function getLanguageName(code) {
    return languageNames[code] || code.toUpperCase();
  }

  /**
   * Create or update the language switcher UI.
   * Preserves the current logical route when switching.
   */
  function renderLanguageSwitcher(containerId = 'language-switcher') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.className = 'language-switcher';

    const currentRoute = (window.Router && Router.getCurrentRoute)
      ? Router.getCurrentRoute().route
      : (window.location.pathname || '/');

    const ul = document.createElement('ul');
    ul.className = 'lang-list';

    availableLanguages.forEach(lang => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = localizedUrl(currentRoute, lang);
      a.textContent = getLanguageName(lang);
      a.className = 'lang-link';
      if (lang === currentLanguage) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }

      a.addEventListener('click', (e) => {
        // Allow normal navigation for static hosting, but also update state
        // We let the browser navigate so that router + main.js handle it.
        // For SPA feel we could preventDefault + Router.navigate, but full navigation is safer for GitHub Pages.
        // To keep URL correct and trigger proper handling, we do nothing special here.
      });

      li.appendChild(a);
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  /**
   * Initialize language from current route.
   * Must be called early in main.js.
   */
  function initFromRoute(routeInfo) {
    if (routeInfo && routeInfo.language) {
      setCurrentLanguage(routeInfo.language);
    } else {
      setCurrentLanguage('en');
    }
  }

  /**
   * Update document title with optional page title.
   */
  function setDocumentTitle(pageTitle) {
    const siteName = (window.siteSettings && window.siteSettings.site_name) || 'Trust Site';
    if (pageTitle) {
      document.title = `${pageTitle} — ${siteName}`;
    } else {
      document.title = siteName;
    }
  }

  return {
    configureFromSettings,
    getCurrentLanguage,
    setCurrentLanguage,
    getAvailableLanguages,
    getFallbackLanguage,
    localizedUrl,
    getLanguageName,
    renderLanguageSwitcher,
    initFromRoute,
    setDocumentTitle
  };
})();

window.I18n = I18n;
