/**
 * menu.js
 * Fetches and renders the dynamic menu from the API.
 * Supports flat items and dropdowns (parent_id).
 */

const Menu = (() => {
  let currentMenuData = null;
  let lastRenderedLang = null;
  let hasDynamicMenu = false;

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
   * Called only when language actually changes (or on initial load).
   * For same-language navigations we only call updateActiveState().
   */
  async function render(language = 'en') {
   const nav = document.getElementById('main-nav');
   if (!nav) return;

   lastRenderedLang = language;

   // Show lightweight fallback immediately
   nav.innerHTML = `<ul></ul>`;

   try {
     const menuData = await fetchMenu(language);
     hasDynamicMenu = !!(menuData && menuData.length);

     if (!hasDynamicMenu) {
       // Keep empty fallback; static links are not critical
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

     setupMobileToggle(nav);
   } catch (err) {
     console.error('[Menu] render failed:', err);
     // leave fallback
   }
  }

  /**
   * Lightweight active-state update for same-language navigation.
   * Does NOT fetch from API. Just walks existing DOM links and toggles .active.
   */
  function updateActiveState(currentRoute = '/') {
   const nav = document.getElementById('main-nav');
   if (!nav) return;

   const normalizedCurrent = normalizeRoute(currentRoute);

   // Update top-level and dropdown links
   const links = nav.querySelectorAll('a[href]');
   links.forEach(a => {
     const href = a.getAttribute('href') || '';
     // Skip external links
     if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
       return;
     }
     const normalizedItem = normalizeRoute(href);
     if (normalizedItem === normalizedCurrent) {
       a.classList.add('active');
     } else {
       a.classList.remove('active');
     }
   });
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
    fetchMenu,
    updateActiveState
  };
})();

window.Menu = Menu;
