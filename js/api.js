/**
 * api.js
 * Centralized client for Google Apps Script JSON API.
 *
 * Supports two modes:
 *   1. Normal fetch()  (works on GitHub Pages after proper deployment)
 *   2. JSONP fallback  (very reliable for localhost development and when CORS is blocked)
 *
 * Google Apps Script Web Apps have notoriously bad CORS support.
 * The backend now includes both proper CORS headers + JSONP support.
 */

const API = (() => {
  const BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL)
    ? CONFIG.API_URL
    : '';

  /**
   * Detect if we are running in a context where normal fetch() is unreliable.
   * Google Apps Script Web Apps have notoriously broken CORS.
   * We prefer JSONP (which the backend supports) for anything that talks to script.google.com.
   */
  function shouldUseJsonp() {
    if (typeof window === 'undefined') return false;

    // Always prefer JSONP for Google Apps Script — it is the only reliably working transport.
    if (BASE_URL && BASE_URL.includes('script.google.com/macros')) {
      return true;
    }

    const origin = window.location.origin || '';
    return origin.includes('localhost') ||
           origin.includes('127.0.0.1') ||
           origin.startsWith('file:');
  }

  /**
   * JSONP implementation (bypasses CORS completely).
   * The backend supports ?callback=xxx
   *
   * We log the exact URL so you can test it manually in a new tab if it fails.
   */
  function jsonpRequest(action, params = {}) {
    return new Promise((resolve) => {
      if (!BASE_URL) {
        resolve({ success: false, error: 'API_URL is not configured.' });
        return;
      }

      const callbackName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

      const url = new URL(BASE_URL);
      url.searchParams.set('action', action);
      url.searchParams.set('callback', callbackName);

      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.set(key, params[key]);
        }
      });

      const fullUrl = url.toString();

      // === VERY IMPORTANT FOR DEBUGGING ===
      console.log('%c[API] JSONP requesting ' + action, 'color:#0a66c2; font-size:13px');
      console.log('%c    >>> COPY AND OPEN THIS URL IN A NEW TAB (or incognito):', 'color:#d32f2f; font-weight:bold; font-size:13px');
      console.log('%c' + fullUrl, 'color:#1e40af; font-family:monospace; font-size:12px');
      console.log('    Expected in new tab: something like  jsonp_cb_...( {"success":true, "data": ... } )');
      console.log('    If you see that → backend is OK, problem is in THIS browser (adblocker etc.)');

      const script = document.createElement('script');
      script.src = fullUrl;

      function cleanup() {
        if (window[callbackName]) delete window[callbackName];
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }

      // Define callback BEFORE we append the script
      window[callbackName] = function (response) {
        cleanup();
        console.log('[API] ✓ JSONP callback SUCCESS for', action);
        if (response && typeof response === 'object') {
          if (response.success === false) {
            resolve({ success: false, error: response.error || 'Unknown error' });
          } else {
            resolve({ success: true, data: response.data !== undefined ? response.data : response });
          }
        } else {
          resolve({ success: true, data: response });
        }
      };

      script.onerror = (ev) => {
        cleanup();
        console.error('[API] ✗ JSONP FAILED to load script for', action);
        console.error('Failed URL:', fullUrl);
        console.error('This is almost always caused by the BROWSER blocking the request, not the server.');
        console.error('Common blockers: uBlock Origin, AdBlock, Brave Shields, Firefox Tracking Protection, corporate firewall.');
        console.error('');
        console.error('>>> ACTION: Open the URL printed above in a completely new tab (or incognito window).');
        console.error('    If you see valid JSONP text there, the problem is your browser/extensions.');
        resolve({ success: false, error: 'JSONP script blocked by browser (adblocker / shield / extension). See console for the URL to test.' });
      };

      script.onload = () => {
        console.log('[API] script.onload for', action, '— waiting for the callback to be invoked by the response...');
      };

      document.head.appendChild(script);

      // Safety timeout
      setTimeout(() => {
        if (window[callbackName]) {
          cleanup();
          console.warn('[API] JSONP timed out for', action);
          resolve({ success: false, error: 'JSONP request timed out' });
        }
      }, 18000);
    });
  }

  /**
   * Low-level request wrapper.
   * Tries normal fetch first. Falls back to JSONP on CORS errors or localhost.
   */
  async function request(action, params = {}) {
    if (!BASE_URL || BASE_URL.includes('YOUR_SCRIPT_ID')) {
      return {
        success: false,
        error: 'API_URL is not configured. Edit js/config.js and set your deployed Apps Script URL.'
      };
    }

    const url = new URL(BASE_URL);
    url.searchParams.set('action', action);

    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    const useJsonp = shouldUseJsonp();

    if (useJsonp) {
      // Always use JSONP for Google Apps Script (most reliable transport)
      console.log('[API] Using JSONP for', action, '(Google Apps Script)');
      return jsonpRequest(action, params);
    }

    // Normal fetch path (production on GitHub Pages, etc.)
    // Google Apps Script Web Apps are extremely unreliable with CORS.
    // If we get non-JSON (HTML error page, 403, etc.) we immediately fall back to JSONP.
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      const text = await response.text();

      // If the response is clearly not JSON (e.g. Google error page, "TypeError: setHeaders", HTML)
      // then the normal path is broken — fall back to JSONP which is known to work.
      const trimmed = text.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        console.warn('[API] fetch() returned non-JSON (probably Apps Script error page). Using JSONP fallback.');
        return jsonpRequest(action, params);
      }

      let json;
      try {
        json = JSON.parse(trimmed);
      } catch (parseErr) {
        console.warn('[API] fetch() returned invalid JSON. Using JSONP fallback.');
        return jsonpRequest(action, params);
      }

      if (json && typeof json === 'object') {
        if (json.success === false) {
          return { success: false, error: json.error || 'Unknown API error' };
        }
        return { success: true, data: json.data !== undefined ? json.data : json };
      }

      return { success: true, data: json };
    } catch (err) {
      // Network / CORS error → JSONP
      console.warn('[API] fetch() failed, trying JSONP fallback...', err.message);
      return jsonpRequest(action, params);
    }
  }

  // === Public API methods ===

  async function settings() {
    const res = await request('settings');
    if (res.success && res.data) {
      // Cache globally for convenience (used by i18n, footer, etc.)
      window.siteSettings = res.data;
    }
    return res;
  }

  async function news(language = 'en') {
    return request('news', { lang: language });
  }

  async function newsById(id, language = 'en') {
    return request('news', { id, lang: language });
  }

  async function newsBySlug(slug, language = 'en') {
    return request('news', { slug, lang: language });
  }

  async function page(slug, language = 'en') {
    return request('page', { slug, lang: language });
  }

  async function menu(language = 'en') {
    return request('menu', { lang: language });
  }

  /**
   * Helper to get a single news item preferring slug then id.
   */
  async function getNewsItem({ id, slug, language = 'en' }) {
    if (slug) return newsBySlug(slug, language);
    if (id) return newsById(id, language);
    return { success: false, error: 'No id or slug provided' };
  }

  return {
    settings,
    news,
    newsById,
    newsBySlug,
    page,
    menu,
    getNewsItem,
    // Expose raw request for advanced use / debugging
    _request: request
  };
})();

window.API = API;
