/**
 * menu.js
 * Fetches and renders the dynamic menu from the API.
 * Supports flat items and dropdowns (parent_id).
 */

const Menu = (() => {
  let currentMenuData = null;

  /**
   * Fetch menu for current language.
   */
  async function fetchMenu(language) {
    const res = await API.menu(language);
    if (!res.success) {
      console.error('Menu fetch failed:', res.error);
      return [];
    }
    currentMenuData = res.data || [];
    return currentMenuData;
  }

  /**
   * Render a single menu item (li).
   */
  function renderMenuItem(item, currentLang, currentRoute) {
    const li = document.createElement('li');
    li.className = item.type === 'dropdown' ? 'dropdown' : '';

    const a = document.createElement('a');
    const url = getMenuItemUrl(item, currentLang);
    a.href = url;
    // Robust title: use translation, fallback to url slug or type
    const fallbackTitle = item.url && item.url !== '#' ? item.url.replace(/^\//, '') : (item.type || 'Link');
    a.textContent = item.title || fallbackTitle || 'Menu';

    // Mark active
    const normalizedCurrent = normalizeRoute(currentRoute);
    const normalizedItem = normalizeRoute(item.url || '');
    if (normalizedCurrent === normalizedItem && item.type !== 'dropdown') {
      a.classList.add('active');
    }

    li.appendChild(a);

    // Dropdown children
    if (item.children && item.children.length > 0) {
      const ul = document.createElement('ul');
      ul.className = 'dropdown-menu';

      item.children.forEach(child => {
        const childLi = document.createElement('li');
        const childA = document.createElement('a');
        childA.href = getMenuItemUrl(child, currentLang);
        childA.textContent = child.title || 'Item';

        const childNorm = normalizeRoute(child.url || '');
        if (normalizedCurrent === childNorm) {
          childA.classList.add('active');
        }

        childLi.appendChild(childA);
        ul.appendChild(childLi);
      });

      li.appendChild(ul);
    }

    return li;
  }

  function normalizeRoute(route) {
    if (!route) return '/';
    let r = route.split('?')[0];
    if (r.length > 1 && r.endsWith('/')) r = r.slice(0, -1);
    return r || '/';
  }

  function getMenuItemUrl(item, currentLang) {
    if (!item || !item.url) return '#';

    // External links stay as-is
    if (/^https?:\/\//i.test(item.url) || item.url.startsWith('mailto:') || item.url.startsWith('tel:')) {
      return item.url;
    }

    // Internal: use localizedUrl
    if (window.I18n && typeof I18n.localizedUrl === 'function') {
      return I18n.localizedUrl(item.url, currentLang);
    }
    // Fallback
    const lang = currentLang || 'en';
    if (lang === 'en') return item.url;
    return item.url === '/' ? `/${lang}/` : `/${lang}${item.url}`;
  }

  /**
   * Render the full menu into #main-nav.
   * Provides an immediate fallback so navigation is visible without blocking
   * the main page content render. The real menu (if available) is loaded in the
   * background and replaces the fallback when ready.
   */
  async function render(language = 'en') {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    // Show fallback immediately. This makes the header usable right away and
    // prevents Menu.render from blocking main content (home/news/page) in main.js.
    nav.innerHTML = `
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/news">News</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    `;

    // Load dynamic menu in the background. Do not await inside this function
    // so that callers are not blocked from rendering #page-content.
    (async () => {
      try {
        const menuData = await fetchMenu(language);
        if (!menuData || menuData.length === 0) {
          // Keep the fallback we already rendered.
          return;
        }

        const ul = document.createElement('ul');
        const currentRouteInfo = (window.Router && Router.getCurrentRoute) ? Router.getCurrentRoute() : { route: '/' };

        menuData.forEach(item => {
          const li = renderMenuItem(item, language, currentRouteInfo.route);
          ul.appendChild(li);
        });

        nav.innerHTML = '';
        nav.appendChild(ul);

        // Mobile toggle wiring (once)
        setupMobileToggle(nav);
      } catch (err) {
        // On any error keep the static fallback (already in the DOM).
        console.error('[Menu] background update failed:', err);
      }
    })();
  }

  function setupMobileToggle(nav) {
    const toggle = document.getElementById('mobile-menu-toggle');
    if (!toggle || toggle.dataset.bound) return;

    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });

    // Close on nav link click (mobile)
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && window.innerWidth < 769) {
        nav.classList.remove('open');
      }
    });

    toggle.dataset.bound = 'true';
  }

  return {
    render,
    fetchMenu
  };
})();

window.Menu = Menu;
