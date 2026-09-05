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
      const home = (window.Router && Router.buildUrl) ? Router.buildUrl('/', 'en') : '/';
      container.innerHTML = `
        <div class="error">
          <h2>Page not found</h2>
          <p>${escapeHtml(res.error || 'The requested page could not be found.')}</p>
          <p><a href="${home}">Go to homepage</a></p>
        </div>
      `;
      return;
    }

    const page = res.data;
    // Normalize template: trim whitespace, lowercase, map aliases
    let template = String(page.template || 'standard').trim().toLowerCase();
    if (template === 'article') template = 'rich';
    if (!['standard', 'landing', 'contact', 'rich'].includes(template)) {
      template = 'standard';
    }

    // Set SEO meta description as early as possible
    setPageMeta(page);

    let html = '';

    switch (template) {
      case 'landing':
        html = renderLandingTemplate(page, slug);
        break;

      case 'contact':
        html = renderContactTemplate(page, slug);
        break;

      case 'rich':
      case 'article':
        html = renderRichTemplate(page, slug);
        break;

      case 'standard':
      default:
        html = renderStandardTemplate(page, slug);
        break;
    }

    container.innerHTML = html;

    if (window.I18n && typeof I18n.setDocumentTitle === 'function') {
      I18n.setDocumentTitle(page.title);
    }
  }

  function formatPageContent(content) {
    if (!content) return '<p>No content available.</p>';
    return content
      .split(/\n{2,}/)
      .map(block => {
        const safe = escapeHtml(block).replace(/\n/g, '<br>');
        return `<p>${safe}</p>`;
      })
      .join('');
  }

  /**
   * Dynamically update SEO meta tags for the current page.
   * Maximally SEO-friendly: description, and keeps good title handling.
   */
  function setPageMeta(page) {
    // Title is handled by I18n.setDocumentTitle in caller
    if (!page) return;

    const description = page.meta_description || page.title || '';

    // Update or create meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', escapeHtml(description).slice(0, 160));

    // Optional: update og:title / og:description if present in head
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && page.title) ogTitle.setAttribute('content', page.title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && description) ogDesc.setAttribute('content', description.slice(0, 200));

    // og:image if provided
    if (page.og_image) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', page.og_image);
    }
  }

  // === SEO-FRIENDLY TEMPLATE RENDERERS ===

  function renderStandardTemplate(page, slug) {
    const imgHtml = page.image
      ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title || '')}" style="max-height:380px;width:100%;object-fit:cover;border-radius:8px;margin:1.5rem 0;">`
      : '';

    return `
      <article class="page-template standard">
        <header class="page-header">
          <h1>${escapeHtml(page.title || slug)}</h1>
        </header>
        <div class="page-content">
          ${imgHtml}
          <div class="page-body">
            ${formatPageContent(page.content || '')}
          </div>
        </div>
      </article>
    `;
  }

  function renderLandingTemplate(page, slug) {
    const imgHtml = page.image
      ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title || '')}" class="landing-hero-image">`
      : '';

    // Split content into sections if it contains double newlines or headings
    const body = formatPageContent(page.content || '');

    return `
      <article class="page-template landing">
        <header class="landing-hero">
          <div class="landing-hero-content">
            <h1 class="landing-title">${escapeHtml(page.title || slug)}</h1>
            ${page.meta_description ? `<p class="landing-lead">${escapeHtml(page.meta_description)}</p>` : ''}
          </div>
          ${imgHtml}
        </header>

        <section class="landing-body container">
          <div class="page-content">
            ${body}
          </div>
        </section>

        <section class="landing-cta">
          <div class="container">
            <h2>Ready to get started?</h2>
            <p>Contact us or explore our latest updates.</p>
            <a href="${I18n ? I18n.localizedUrl('/contacts', currentLang) : '/contacts'}" class="btn btn-primary">Get in touch</a>
          </div>
        </section>
      </article>
    `;
  }

  function renderContactTemplate(page, slug) {
    const body = formatPageContent(page.content || '');

    return `
      <article class="page-template contact">
        <header class="page-header">
          <h1>${escapeHtml(page.title || 'Contact Us')}</h1>
          ${page.meta_description ? `<p class="page-lead">${escapeHtml(page.meta_description)}</p>` : ''}
        </header>

        <div class="contact-grid">
          <section class="contact-info">
            <h2>Contact Information</h2>
            <div class="page-body">
              ${body}
            </div>

            <div class="contact-details">
              <p><strong>Email:</strong> <a href="mailto:info@trustsite.example">info@trustsite.example</a></p>
              <p><strong>Phone:</strong> <a href="tel:+10000000000">+1 (000) 000-0000</a></p>
            </div>
          </section>

          <section class="contact-form">
            <h2>Send us a message</h2>
            <form id="contact-form" onsubmit="event.preventDefault(); alert('Thank you! This is a demo form. In production connect to your preferred service.');">
              <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" name="name" required>
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
              </div>
              <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" rows="5" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Send Message</button>
            </form>
            <p class="form-note">This form is for demonstration. Replace with your real form handler.</p>
          </section>
        </div>
      </article>
    `;
  }

  function renderRichTemplate(page, slug) {
    const imgHtml = page.image
      ? `<figure class="rich-featured-image">
           <img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title || '')}">
         </figure>`
      : '';

    const body = formatPageContent(page.content || '');

    return `
      <article class="page-template rich">
        <header class="rich-header">
          <h1>${escapeHtml(page.title || slug)}</h1>
          ${page.meta_description ? `<p class="rich-lead">${escapeHtml(page.meta_description)}</p>` : ''}
        </header>

        ${imgHtml}

        <div class="rich-content">
          <div class="page-content">
            ${body}
          </div>
        </div>

        <footer class="rich-footer">
          <p>Thank you for reading. <a href="${I18n ? I18n.localizedUrl('/news', currentLang) : '/news'}">Browse more articles</a></p>
        </footer>
      </article>
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

  return {
    renderPage,
    setLanguage
  };
})();

window.Pages = Pages;
