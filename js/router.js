/**
 * Router for path-based language routing.
 *
 * Parses window.location.pathname and returns:
 *   { language: "ru", route: "/news" }
 *
 * English is the default (no prefix).
 *
 * Supports deep links via 404.html fallback (sessionStorage.redirectPath).
 */

const Router = (() => {
  // Default supported languages. Will be updated from settings when available.
  let supportedLanguages = ['en', 'ru', 'pl'];

  function setSupportedLanguages(langs) {
    if (Array.isArray(langs) && langs.length > 0) {
      supportedLanguages = langs.map(l => l.toLowerCase());
    }
  }

  function getSupportedLanguages() {
    return [...supportedLanguages];
  }

  /**
   * Normalize pathname: remove trailing slash (except for root), collapse multiple slashes.
   */
  function normalizePathname(pathname) {
    if (!pathname) return '/';
    let p = pathname.split('?')[0].split('#')[0];
    p = p.replace(/\/+/g, '/');           // collapse //
    if (p.length > 1 && p.endsWith('/')) {
      p = p.slice(0, -1);
    }
    return p || '/';
  }

  /**
   * Parse a pathname into { language, route }
   */
  function parsePath(pathname = window.location.pathname) {
    const path = normalizePathname(pathname);
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return { language: 'en', route: '/' };
    }

    const first = segments[0].toLowerCase();

    if (supportedLanguages.includes(first)) {
      const rest = segments.slice(1);
      const route = rest.length > 0 ? '/' + rest.join('/') : '/';
      return { language: first, route };
    }

    // No language prefix → English
    return { language: 'en', route: path };
  }

  /**
   * Get the current route from the browser (or from redirect stored by 404.html).
   */
  function getCurrentRoute() {
    // Support GitHub Pages SPA fallback
    const redirect = sessionStorage.getItem('redirectPath');
    if (redirect) {
      // Clear it so we don't loop on refresh
      sessionStorage.removeItem('redirectPath');
      return parsePath(redirect);
    }
    return parsePath(window.location.pathname);
  }

  /**
   * Build a URL for a given logical route and language.
   * Used by i18n.localizedUrl (preferred to call through i18n).
   */
  function buildUrl(route, language) {
    const lang = (language || 'en').toLowerCase();
    let cleanRoute = route || '/';

    if (!cleanRoute.startsWith('/')) {
      cleanRoute = '/' + cleanRoute;
    }

    // Normalize
    if (cleanRoute.length > 1 && cleanRoute.endsWith('/')) {
      cleanRoute = cleanRoute.slice(0, -1);
    }

    if (lang === 'en' || !supportedLanguages.includes(lang)) {
      return cleanRoute === '/' ? '/' : cleanRoute;
    }

    if (cleanRoute === '/') {
      return `/${lang}/`;
    }
    return `/${lang}${cleanRoute}`;
  }

  /**
   * Navigate programmatically (updates history and triggers route handling).
   */
  function navigate(route, language) {
    const url = buildUrl(route, language);
    if (url === window.location.pathname) {
      // Same path, just re-dispatch
      window.dispatchEvent(new Event('popstate'));
      return;
    }
    history.pushState({}, '', url);
    window.dispatchEvent(new Event('popstate'));
  }

  // Expose minimal API
  return {
    parsePath,
    getCurrentRoute,
    buildUrl,
    navigate,
    setSupportedLanguages,
    getSupportedLanguages
  };
})();

// Make available globally for other modules
window.Router = Router;
