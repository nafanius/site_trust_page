/**
 * news.js
 * News listing and detail views.
 */

const News = (() => {
  let currentLang = 'en';

  function setLanguage(lang) {
    currentLang = lang || 'en';
  }

  /**
   * Render news list into #page-content.
   * Header (title + optional lead/subtitle) is loaded from pages.slug="news" + page_translations
   * so that /news page header is fully translatable from Google Sheets.
   */
  async function renderList() {
    const container = document.getElementById('page-content');
    if (!container) return;

    // Default static header (will be replaced if page "news" exists in Sheets)
    let headerHtml = `
      <div class="page-header">
      </div>
    `;

    // Try to load dynamic header from pages (slug = "news")
    try {
      const pageRes = await API.page('news', currentLang);
      if (pageRes && pageRes.success && pageRes.data && pageRes.data.title) {
        const p = pageRes.data;
        const lead = p.lead || p.content || p.meta_description || '';
        headerHtml = `
          <div class="flex items-end justify-between mb-8 mx-3">
          <div>
              <div class="tracking-[1.5px] font-semibold text-[#f9794c]">${escapeHtml(p.title)}</div>
              ${lead ? `<h1  class="text-3xl font-semibold tracking-[-1px] text-[#243E58]">${escapeHtml(lead)}</h1>` : ''}
          </div>
          </div>
        `;

        // Update document title
        if (window.I18n && typeof I18n.setDocumentTitle === 'function') {
          I18n.setDocumentTitle(p.title);
        }
       
        // SEO: set meta description from news text
        p.slug='news';
        p.title=lead;
        p.language_link = getLocalizedNewsLink(p);
        setNewsMeta(p);


      }
    } catch (e) {
      // keep default header
    }

    container.innerHTML = `
    <section id="news" class="max-w-[1280px] mx-auto px-3 md:px-4 lg:px-6 py-8 md:py-10">
      ${headerHtml}
      <div id="news-list" class="grid grid-cols-1 md:grid-cols-3 gap-5 mx-4"></div>
    </section>
    `;

    const listEl = document.getElementById('news-list');
    listEl.innerHTML = '<div class="loading">Loading news...</div>';

    const res = await API.news(currentLang);
    if (!res.success) {
      listEl.innerHTML = `<div class="error">Failed to load news: ${escapeHtml(res.error)}</div>`;
      return;
    }

    const items = res.data || [];
    if (items.length === 0) {
      listEl.innerHTML = '<div class="news-empty">No news available yet.</div>';
      return;
    }

    listEl.innerHTML = '';

    items.forEach(item => {
      const card = createNewsCard(item);
      listEl.appendChild(card);
    });
  }

  function createNewsCard(item) {
    const card = document.createElement('article');
    card.className = 'group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#055a96]/30 hover:shadow-sm transition-all';

    const imgHtml = item.image
      ? ` <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || 'News')}" 
            class="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-[1.03]" />`
      : `<div style="height:160px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:0.9rem;">No image</div>`;
      
    const dateStr = item.date ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const category = item.category ? item.category : '';

    const link = getLocalizedNewsLink(item);

    card.innerHTML = `
      <a href="${link}" style="text-decoration: none;" class="overflow-hidden hover:border-[#055a96]/30 hover:shadow-sm transition-all">
      ${imgHtml}
       <div class="p-4">
         <div class="uppercase text-[10px] tracking-widest text-[#f9794c] mb-1">${category}</div>
          <h4 class="font-semibold text-lg leading-tight group-hover:text-[#055a96] mb-2">${escapeHtml(item.title || 'Untitled')}</h4>
          <p class="text-sm text-[#45464d] mb-3">${escapeHtml(truncate(item.text || '', 140))}</p>
          <div class="text-xs text-[#939598]">${escapeHtml(dateStr)}</div>
       </div>
      </a>

    `;

    // Make whole card clickable except the button (better UX)
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      window.location.href = link;
    });

    return card;
  }

  function getLocalizedNewsLink(item) {
    if (item.link && /^https?:\/\//i.test(item.link)) {
      return item.link;
    }

    if (item.slug === '/news' || item.slug === 'news') {
      return window.I18n && typeof I18n.localizedUrl === 'function' ? I18n.localizedUrl('/news', currentLang)
        : (window.Router && typeof Router.buildUrl === 'function' ? Router.buildUrl('/news', currentLang) : '/news');
    }

    const slugPath = item.slug ? `/news/${item.slug}` : `/news/${item.id}`;
    if (window.I18n && typeof I18n.localizedUrl === 'function') {
      return I18n.localizedUrl(slugPath, currentLang);
    }
    if (window.Router && typeof Router.buildUrl === 'function') {
      return Router.buildUrl(slugPath, currentLang);
    }
    return currentLang === 'en' ? slugPath : `/${currentLang}${slugPath}`;
  }

  /**
   * Render a single news article.
   */
  async function renderDetail(slugOrId) {
    const container = document.getElementById('page-content');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading article...</div>';

    let res;
    if (slugOrId && isNaN(Number(slugOrId))) {
      res = await API.newsBySlug(slugOrId, currentLang);
    } else {
      res = await API.newsById(slugOrId, currentLang);
    }

    if (!res.success || !res.data) {
      const back = (window.I18n && I18n.localizedUrl) ? I18n.localizedUrl('/news', currentLang)
        : ((window.Router && Router.buildUrl) ? Router.buildUrl('/news', currentLang) : '/news');
      container.innerHTML = `
        <div class="error">
          <h2>Article not found</h2>
          <p>${escapeHtml(res.error || 'The requested news item could not be found.')}</p>
          <a href="${back}">← Back to news</a>
        </div>
      `;
      return;
    }

    const item = res.data;

    item.language_link = getLocalizedNewsLink(item)

    const dateStr = item.date ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const category = item.category ? item.category : '';

    const imgHtml = item.image
      ? `<div class="group relative w-full md:w-80 lg:w-96 aspect-[16/9] md:aspect-video overflow-hidden rounded-2xl shadow mb-6 md:mb-2 md:float-right md:ml-6 md:mr-0 bg-gray-100">
           <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || '')}" 
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy">
         </div>`
      : '';

    const backUrl = I18n ? I18n.localizedUrl('/news', currentLang) : (currentLang === 'en' ? '/news' : `/${currentLang}/news`);
    const contactsUrl = I18n ? I18n.localizedUrl('/contacts', currentLang) : (currentLang === 'en' ? '/contacts' : `/${currentLang}/contacts`);

    container.innerHTML = `
      <article class="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
       <div class="mb-6"> 
       <a href="${backUrl}" class="inline-flex items-center text-sm font-medium text-[#055a96] hover:underline">← Back to all news</a>
      </div>
      <div class="uppercase text-[10px] tracking-[1.5px] font-semibold text-[#f9794c] mb-2">${category}</div>
      <h1 class="text-4xl md:text-[42px] font-semibold tracking-[-1.2px] text-[#243E58] leading-tight mb-4">${escapeHtml(item.title || 'Untitled')}</h1>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#939598] mb-8">
      <span>${dateStr}</span>
      </div>
      <div class="max-w-6xl text-[15px] leading-relaxed text-[#45464d] overflow-hidden">
          ${imgHtml}
          ${formatNewsText(item.text || '')}
          <div class="clear-both"></div>
      </div>
      <div class="mt-10 pt-8 border-t clear-both">
          <a href="${contactsUrl}" class="inline-flex items-center text-sm font-semibold text-[#f9794c] hover:underline">${escapeHtml(item.button)} →</a>
      </div>
      </article>
    `;

    // Update document title
    if (window.I18n && typeof I18n.setDocumentTitle === 'function') {
      I18n.setDocumentTitle(item.title);
    }

    // SEO: set meta description from news text
    setNewsMeta(item);
  }

  function setNewsMeta(item) {
    if (!item) return;

    const domainName  = (typeof CONFIG !== 'undefined' && CONFIG.DOMAIN_NAME)
    ? CONFIG.DOMAIN_NAME
    : '';
    
    const desc = (item.text || item.title || '').slice(0, 160);
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', escapeHtml(desc));
    
    const canonicalLink = `${domainName}${item.language_link}`;
    let LinkCan = document.querySelector('link[name="canonical"]');
    LinkCan.setAttribute('href',canonicalLink);
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalLink);
    }

    // OG title
    let title = (item.title || '').slice(0, 160);
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    // Optional OG tags
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);

    // og image
    const imageOg = (item.image|| domainName+'/assets/1.png' || '')

    if (imageOg) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content',imageOg);
    }
  }

  function formatNewsText(text) {
    // Simple paragraph splitting. For richer content, the backend can return HTML
    // but we keep it safe here.
    return text
      .split(/\n{2,}/)
      .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len - 1) + '…' : str;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str);
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    renderList,
    renderDetail,
    setLanguage
  };
})();

window.News = News;
