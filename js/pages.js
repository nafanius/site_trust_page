/**
 * pages.js
 * Dynamic page rendering from Google Sheets (slug + template).
 */

const Pages = (() => {
  let currentLang = 'en';

  function setLanguage(lang) {
    currentLang = lang || 'en';
  }

  /**
   * Render a dynamic page by slug.
   */
  async function renderPage(slug) {
    const container = document.getElementById('page-content');
    if (!container) return;

    if (!slug) {
      container.innerHTML = '<div class="error">Page slug is missing.</div>';
      return;
    }

    container.innerHTML = '<div class="loading">Loading page...</div>';

    const res = await API.page(slug, currentLang);

    if (!res.success || !res.data) {
      container.innerHTML = `
        <div class="error">
          <h2>Page not found</h2>
          <p>${escapeHtml(res.error || 'The requested page could not be found.')}</p>
          <p><a href="/">Go to homepage</a></p>
        </div>
      `;
      return;
    }

    const page = res.data;

    // Currently only "standard" template is implemented.
    // Future templates can be added here based on page.template.
    const template = page.template || 'standard';

    let html = '';

    if (template === 'standard') {
      const imgHtml = page.image
        ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title || '')}" style="max-height:320px;margin-bottom:1.5rem;">`
        : '';

      html = `
        <div class="page-header">
          <h1>${escapeHtml(page.title || slug)}</h1>
        </div>
        <div class="standard-page page-content">
          ${imgHtml}
          <div class="page-body">
            ${formatPageContent(page.content || '')}
          </div>
        </div>
      `;
    } else {
      // Unknown template fallback
      html = `
        <div class="page-header">
          <h1>${escapeHtml(page.title || slug)}</h1>
        </div>
        <div class="page-content">
          ${formatPageContent(page.content || '')}
        </div>
      `;
    }

    container.innerHTML = html;

    if (window.I18n && typeof I18n.setDocumentTitle === 'function') {
      I18n.setDocumentTitle(page.title);
    }
  }

  function formatPageContent(content) {
    // Treat content as simple markdown-like paragraphs for safety.
    // If you want to allow limited HTML from Sheets, sanitize here.
    if (!content) return '<p>No content available.</p>';

    // Split on blank lines → paragraphs
    return content
      .split(/\n{2,}/)
      .map(block => {
        // Very basic: allow single newlines as <br>
        const safe = escapeHtml(block).replace(/\n/g, '<br>');
        return `<p>${safe}</p>`;
      })
      .join('');
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

  return {
    renderPage,
    setLanguage
  };
})();

window.Pages = Pages;
