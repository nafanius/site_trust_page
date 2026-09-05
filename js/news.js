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
   */
  async function renderList() {
    const container = document.getElementById('page-content');
    if (!container) return;

    container.innerHTML = `
      <div class="page-header">
        <h1>News</h1>
      </div>
      <div id="news-list" class="news-grid"></div>
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
    card.className = 'news-card';

    const imgHtml = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || '')}" loading="lazy">`
      : `<div style="height:160px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:0.9rem;">No image</div>`;

    const dateStr = item.date ? new Date(item.date).toLocaleDateString() : '';
    const category = item.category ? `<span class="category-badge">${escapeHtml(item.category)}</span>` : '';

    const link = getLocalizedNewsLink(item);

    card.innerHTML = `
      ${imgHtml}
      <div class="news-card-content">
        <div class="news-card-meta">${category}${dateStr ? ' ' + escapeHtml(dateStr) : ''}</div>
        <h3>${escapeHtml(item.title || 'Untitled')}</h3>
        <p>${escapeHtml(truncate(item.text || '', 140))}</p>
        <a href="${link}" class="btn">${escapeHtml(item.button || 'Read more')}</a>
      </div>
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
    const dateStr = item.date ? new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const category = item.category ? `<span class="category-badge">${escapeHtml(item.category)}</span>` : '';

    const imgHtml = item.image
      ? `<div class="news-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || '')}"></div>`
      : '';

    const backUrl = I18n ? I18n.localizedUrl('/news', currentLang) : (currentLang === 'en' ? '/news' : `/${currentLang}/news`);

    container.innerHTML = `
      <article class="news-detail">
        <a href="${backUrl}" class="back-link">← Back to news</a>
        <h1>${escapeHtml(item.title || 'Untitled')}</h1>
        <div class="news-meta">${category} ${dateStr ? escapeHtml(dateStr) : ''}</div>
        ${imgHtml}
        <div class="news-body">
          ${formatNewsText(item.text || '')}
        </div>
        ${item.button && item.link ? `<p style="margin-top:2rem;"><a href="${escapeHtml(getLocalizedNewsLink(item))}" class="btn">${escapeHtml(item.button)}</a></p>` : ''}
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

    const desc = (item.text || item.title || '').slice(0, 160);

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', escapeHtml(desc));

    // Optional OG tags
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);

    if (item.image) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', item.image);
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
