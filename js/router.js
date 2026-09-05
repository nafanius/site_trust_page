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

  // Detected deployment base path, e.g. '' or '/my-repo' for GitHub project sites.
  // All internal links and history entries must include this base so that
  // direct navigation and <a href> clicks work on subpath deployments.
  let basePath = '';

  function setSupportedLanguages(langs) {
    if (Array.isArray(langs) && langs.length > 0) {
      supportedLanguages = langs.map(l => l.toLowerCase());
    }
  }

  function getSupportedLanguages() {
    return [...supportedLanguages];
  }

  function getBasePath() {
    return basePath;
  }

  /**
   * Compute the deployment base from a full server pathname.
   * Example: '/my-repo/ru/news' → base '/my-repo'
   *          '/about' → base ''
   * Ignores 'index.html' and similar file names.
   */
  function computeBaseFromPath(fullPathname) {
    let p = normalizePathname(fullPathname);
    // Remove common index filenames so /my-repo/index.html is treated as /my-repo/
    p = p.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '');
    p = normalizePathname(p);
    const segs = p.split('/').filter(Boolean);
    if (segs.length === 0) return '';

    const knownAppSegments = new Set([
      ...supportedLanguages,
      'news', 'about', 'contact', 'contacts', 'page'
    ]);

    for (let i = 0; i < segs.length; i++) {
      const s = segs[i].toLowerCase();
      if (knownAppSegments.has(s)) {
        const baseSegs = segs.slice(0, i);
        return baseSegs.length ? '/' + baseSegs.join('/') : '';
      }
    }
    return '/' + segs.join('/');
  }

  /**
   * Strip a known base prefix from a pathname (if present).
   */
  function stripBase(pathname, base) {
    if (!base || base === '/') return pathname;
    const p = normalizePathname(pathname);
    if (p === base || p.startsWith(base + '/')) {
      const stripped = p.slice(base.length) || '/';
      return stripped.startsWith('/') ? stripped : '/' + stripped;
    }
    return p;
  }

  /**
   * Detect and cache the deployment base path from current location.
   * Called automatically on first route parse or URL build.
   */
  function detectBasePath() {
    if (basePath) return basePath;

    const candidate = window.location.pathname || '/';
    let detected = computeBaseFromPath(candidate);
    if (detected === '/') detected = '';
    basePath = detected;
    return basePath;
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
   * Parse a pathname into { language, route }.
   * Automatically detects and strips deployment base path (e.g. /REPO).
   */
  function parsePath(pathname = window.location.pathname) {
    // Ensure we have detected the base (cheap after first call)
    const base = detectBasePath();

    // Strip base first so we only look at the app portion of the URL
    let path = stripBase(pathname, base);
    path = normalizePathname(path);
    let segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return { language: 'en', route: '/' };
    }

    const langCandidate = segments[0].toLowerCase();

    if (supportedLanguages.includes(langCandidate)) {
      const rest = segments.slice(1);
      const route = rest.length > 0 ? '/' + rest.join('/') : '/';
      return { language: langCandidate, route };
    }

    // No language prefix → English
    return { language: 'en', route: path };
  }

  /**
   * GitHub Pages SPA redirect support (and generic static hosting).
   * 404.html redirects deep links to index.html?__spa_path=/original/path
   * (using a relative path so it works at root or under /REPO/).
   *
   * We read the param, clean the URL with replaceState, and return the intended path.
   */
  function handleGithubPagesRedirect() {
    const loc = window.location;
    const search = loc.search || '';
    let intendedPath = null;

    // New robust format used by current 404.html: ?__spa_path=/about or ?__spa_path=%2Fru%2Fnews
    const spaMatch = /[?&]__spa_path=([^&]*)/.exec(search);
    if (spaMatch) {
      try {
        intendedPath = decodeURIComponent(spaMatch[1]);
        if (!intendedPath.startsWith('/')) intendedPath = '/' + intendedPath;
      } catch (_) {
        intendedPath = '/' + (spaMatch[1] || '');
      }
    }

    // Legacy formats from older 404.html or other SPA setups
    if (!intendedPath) {
      if (search.startsWith('?/')) {
        const after = search.slice(2);
        intendedPath = '/' + after.split('&')[0].replace(/~and~/g, '&');
      } else if (search.includes('?/')) {
        const m = search.match(/\?\/([^&]*)/);
        if (m) intendedPath = '/' + (m[1] || '').replace(/~and~/g, '&');
      } else if (search.startsWith('?p=/') || search.includes('&p=/')) {
        const m = search.match(/[?&]p=([^&]*)/);
        if (m) intendedPath = decodeURIComponent(m[1]).replace(/~and~/g, '&');
      }
    }

    if (intendedPath) {
      // Remove the __spa_path (and any other spa query junk) and set clean URL
      const cleanUrl = intendedPath + (loc.hash || '');
      try {
        // Use replaceState so back button doesn't land on the ugly redirect URL
        history.replaceState(null, '', cleanUrl);
      } catch (_) {}
      return intendedPath;
    }

    // Legacy sessionStorage fallback (old 404.html)
    const legacy = sessionStorage.getItem('redirectPath');
    if (legacy) {
      sessionStorage.removeItem('redirectPath');
      return legacy;
    }

    return null;
  }

  /**
   * Get the current route from the browser (or from redirect stored by 404.html).
   */
  function getCurrentRoute() {
    // Make sure base path is detected early (important for project sites)
    detectBasePath();

    // Support GitHub Pages SPA fallback (index.html?__spa_path=... or legacy)
    const redirected = handleGithubPagesRedirect();
    if (redirected) {
      return parsePath(redirected);
    }
    return parsePath(window.location.pathname);
  }

  /**
   * Build a URL for a given logical route and language.
   * Respects any detected deployment base path (e.g. /my-repo for GitHub project sites).
   * Used by i18n.localizedUrl (preferred to call through i18n).
   */
  function buildUrl(route, language) {
    const base = detectBasePath();
    const lang = (language || 'en').toLowerCase();
    let cleanRoute = route || '/';

    if (!cleanRoute.startsWith('/')) {
      cleanRoute = '/' + cleanRoute;
    }

    // Normalize
    if (cleanRoute.length > 1 && cleanRoute.endsWith('/')) {
      cleanRoute = cleanRoute.slice(0, -1);
    }

    let appUrl;
    if (lang === 'en' || !supportedLanguages.includes(lang)) {
      appUrl = cleanRoute === '/' ? '/' : cleanRoute;
    } else if (cleanRoute === '/') {
      appUrl = `/${lang}/`;
    } else {
      appUrl = `/${lang}${cleanRoute}`;
    }

    // Prefix deployment base (if any)
    if (!base) return appUrl;
    if (appUrl === '/') return base + '/';
    return base + appUrl;
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
    getSupportedLanguages,
    getBasePath,
    // internal for debugging
    _detectBasePath: detectBasePath
  };
})();

// Make available globally for other modules
window.Router = Router;
