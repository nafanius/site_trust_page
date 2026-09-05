/**
 * api.js
 * Centralized client for Google Apps Script JSON API.
 *
 * All communication with the backend goes through this module.
 * Uses fetch + URLSearchParams.
 *
 * Response contract (always):
 *   Success: { success: true, data: ... }
 *   Error:   { success: false, error: "message" }
 */

const API = (() => {
  const BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL)
    ? CONFIG.API_URL
    : '';

  /**
   * Low-level fetch wrapper.
   * Always returns a normalized object.
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

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        // Apps Script Web Apps do not support custom headers well in some cases.
        // Keep it simple.
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const json = await response.json();

      // Backend should already follow the contract, but we normalize anyway.
      if (json && typeof json === 'object') {
        if (json.success === false) {
          return { success: false, error: json.error || 'Unknown API error' };
        }
        return { success: true, data: json.data !== undefined ? json.data : json };
      }

      return { success: true, data: json };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network or parsing error'
      };
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
