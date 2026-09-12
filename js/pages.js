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

    // Support rich translatable fields from page_translations
    const lead = page.lead || page.subtitle || page.meta_description || '';
    const extra = page.extra_content || page.extra || '';

    return `
        <header class="page-header px-3">
          <h1>${escapeHtml(page.title || slug)}</h1>
        </header>
        ${lead}
    `;
    // return `
    //   <article class="page-template standard">
    //     <header class="page-header">
    //       <h1>${escapeHtml(page.title || slug)}</h1>
    //       ${lead ? `<p class="page-lead">${escapeHtml(lead)}</p>` : ''}
    //     </header>
    //     <div class="page-content">
    //       ${imgHtml}
    //       <div class="page-body">
    //         ${formatPageContent(page.content || '')}
    //         ${extra ? `<div class="page-extra">${formatPageContent(extra)}</div>` : ''}
    //       </div>
    //     </div>
    //   </article>
    // `;
  }

  function renderLandingTemplate(page, slug) {
    const imgHtml = page.image
      ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.title || '')}" class="landing-hero-image">`
      : '';

    const body = formatPageContent(page.content || '');
    const lead = page.lead || page.subtitle || page.meta_description || '';
    const ctaTitle = page.cta_title || page.ctaTitle || 'Ready to get started?';
    const ctaText = page.cta_text || page.ctaText || 'Contact us or explore our latest updates.';
    const ctaLabel = page.cta_label || page.ctaLabel || page.button || 'Get in touch';
    const ctaUrl = page.cta_url || page.ctaUrl || (I18n ? I18n.localizedUrl('/contacts', currentLang) : '/contacts');

    return `
      <article class="page-template landing">
        <header class="landing-hero">
          <div class="landing-hero-content">
            <h1 class="landing-title">${escapeHtml(page.title || slug)}</h1>
            ${lead ? `<p class="landing-lead">${escapeHtml(lead)}</p>` : ''}
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
            <h2>${escapeHtml(ctaTitle)}</h2>
            <p>${escapeHtml(ctaText)}</p>
            <a href="${escapeHtml(ctaUrl)}" class="btn btn-primary">${escapeHtml(ctaLabel)}</a>
          </div>
        </section>
      </article>
    `;
  }

  function renderContactTemplate(page, slug) {
    const body = formatPageContent(page.content || '');

    // Rich translatable fields from page_translations (or pages)
    // Admins can add any of these columns to page_translations for the contacts row.
    const infoTitle = page.info_title || page.infoTitle || 'Contact Information';
    const formTitle = page.form_title || page.formTitle || 'Send us a message';
    const email = page.contact_email || page.contactEmail || page.email || 'info@trustsite.example';
    const phone = page.contact_phone || page.contactPhone || page.phone || '';
    const address = page.address || page.location || '';
    const formNote = page.form_note || page.formNote || 'This form is for demonstration. Replace with your real form handler.';
    const submitLabel = page.submit_label || page.submitLabel || page.button || 'Send Message';
    const lead = page.lead || page.subtitle || page.meta_description || '';

    const contactDetails = [];
    if (email) contactDetails.push(`<p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`);
    if (phone) contactDetails.push(`<p><strong>Phone:</strong> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>`);
    if (address) contactDetails.push(`<p><strong>Address:</strong> ${escapeHtml(address)}</p>`);

    return `
      <article class="page-template contact">
        <header class="page-header">
          <h1>${escapeHtml(page.title || 'Contact Us')}</h1>
          ${lead ? `<p class="page-lead">${escapeHtml(lead)}</p>` : ''}
        </header>

        <div class="contact-grid">
          <section class="contact-info">
            <h2>${escapeHtml(infoTitle)}</h2>
            <div class="page-body">
              ${body}
            </div>

            ${contactDetails.length ? `<div class="contact-details">${contactDetails.join('')}</div>` : ''}
          </section>

          <section class="contact-form">
            <h2>${escapeHtml(formTitle)}</h2>
            <form id="contact-form" onsubmit="event.preventDefault(); window.Pages.sendForm();">
              <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" name="name" required>
              </div>
              <div class="form-group">
                <label for="phone">Phone</label>
                <input type="phone" id="phone" name="phone" required>
              </div>
              <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" rows="5" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary">${escapeHtml(submitLabel)}</button>
            </form>
            ${formNote ? `<p class="form-note">${escapeHtml(formNote)}</p>` : ''}
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
    const lead = page.lead || page.subtitle || page.meta_description || '';
    const footerText = page.footer_text || page.footerText || 'Thank you for reading.';
    const moreLabel = page.more_label || page.moreLabel || 'Browse more articles';
    const moreUrl = page.more_url || page.moreUrl || (I18n ? I18n.localizedUrl('/news', currentLang) : '/news');

    return `
      <article class="page-template rich">
        <header class="rich-header">
          <h1>${escapeHtml(page.title || slug)}</h1>
          ${lead ? `<p class="rich-lead">${escapeHtml(lead)}</p>` : ''}
        </header>

        ${imgHtml}

        <div class="rich-content">
          <div class="page-content">
            ${body}
          </div>
        </div>

        <footer class="rich-footer">
          <p>${escapeHtml(footerText)} <a href="${escapeHtml(moreUrl)}">${escapeHtml(moreLabel)}</a></p>
        </footer>
      </article>
    `;
  }

  async function sendForm() {
    const form = document.querySelector("#contact-form");
    const FORM_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL)
      ? CONFIG.API_URL
      : '';



    const data = {
      name: form.name.value,
      phone: form.phone.value,
      message: form.message.value
    };

    await fetch(FORM_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data)
    });
    // await fetch(FORM_URL, {
    //   method: "POST",
    //   mode: "no-cors",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data)
    // });
    // await fetch(
    //   FORM_URL,
    //   {
    //     method: "POST",
    //     body: JSON.stringify(data)
    //   }
    // );

    form.reset();

    alert("Заявка отправлена!");

  }

  function escapeHtml(str) {
    return str
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
    setLanguage,
    sendForm,
  };
})();

window.Pages = Pages;
