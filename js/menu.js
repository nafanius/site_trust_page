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
   * Active state is applied afterwards by updateActiveState() (single source of truth).
   */
  function renderMenuItem(item, currentLang) {
    const li = document.createElement('li');
    li.className = item.type === 'dropdown' ? 'dropdown' : '';

    const a = document.createElement('a');
    const url = getMenuItemUrl(item, currentLang);
    a.href = url;
    a.classList.add('text-lg');
    // Robust title: use translation, fallback to url slug or type
    const fallbackTitle = item.url && item.url !== '#' ? item.url.replace(/^\//, '') : (item.type || 'Link');
    a.textContent = item.title || fallbackTitle || 'Menu';

    // Store the logical (language-independent) route for reliable active matching
    // after language switches and on clicks. updateActiveState() will use this.
    const logicalItem = normalizeRoute(item.url || '/');
    a.dataset.route = logicalItem;

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

        // Store logical route for reliable active-state updates
        const childLogical = normalizeRoute(child.url || '/');
        childA.dataset.route = childLogical;

        childLi.appendChild(childA);
        ul.appendChild(childLi);
      });

      li.appendChild(ul);
    }

    return li;
  }

  function normalizeRoute(route) {
    if (!route) return '/';
    let r = String(route).split('?')[0].split('#')[0];
    r = r.replace(/\/+/g, '/').trim();
    if (!r.startsWith('/')) r = '/' + r;
    if (r.length > 1 && r.endsWith('/')) r = r.slice(0, -1);
    return r || '/';
  }

  /**
   * Returns true if the menu item's logical route should be considered active
   * for the given current logical route.
   * - Exact match for everything
   * - For non-root items, also match when current is a sub-route (e.g. /news active for /news/slug)
   */
  function isRouteActive(menuLogical, currentLogical) {
    const m = normalizeRoute(menuLogical);
    const c = normalizeRoute(currentLogical);
    if (m === c) return true;
    if (m === '/' || c === '/') return false;
    return c === m || c.startsWith(m + '/');
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

     menuData.forEach(item => {
       const li = renderMenuItem(item, language);
       ul.appendChild(li);
     });

     nav.innerHTML = '';
     nav.appendChild(ul);

     setupMobileToggle(nav);

     // Always run a final robust active-state pass after (re)render.
     // This ensures .active is set correctly even after language switches
     // (menu links have localized hrefs like /ru/about while current route is logical).
     // We call without args — updateActiveState always reads live Router state.
     updateActiveState();
   } catch (err) {
     console.error('[Menu] render failed:', err);
     // leave fallback
   }
  }

  /**
   * Lightweight active-state update for same-language navigation.
   * Does NOT fetch from API. Just walks existing DOM links and toggles .active.
   * Always derives the current logical route from Router (live source of truth).
   * Prefers data-route (set at render from the CMS logical .url) for matching,
   * falls back to parsing the (possibly localized) href via Router.parsePath.
   * Explicitly clears all then sets the matching one(s) so clicks reliably activate.
   */
  function updateActiveState() {
   const nav = document.getElementById('main-nav');
   if (!nav) return;

   // Live current logical route (language and base stripped by Router)
   let currentLogical = '/';
   if (window.Router && typeof Router.getCurrentRoute === 'function') {
     try {
       const info = Router.getCurrentRoute();
       if (info && info.route != null) currentLogical = info.route;
     } catch (_) {}
   } else if (window.Router && typeof Router.parsePath === 'function') {
     try {
       const p = Router.parsePath(window.location.pathname);
       if (p && p.route != null) currentLogical = p.route;
     } catch (_) {}
   }
   const links = nav.querySelectorAll('a[href]');

   // 1) Explicitly remove .active from every internal menu link.
   //    This guarantees that after a click the old item loses the class.
   links.forEach(a => {
     const href = a.getAttribute('href') || '';
     if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
       return;
     }
     a.classList.remove('active');
   });

   // 2) Add .active to the link(s) whose logical route matches the live current route.
   //    Using data-route (preferred, language-independent, from item.url in CMS)
   //    or falling back to Router.parsePath on the href makes this survive
   //    language switches and ensures the newly chosen item receives .active.
   links.forEach(a => {
     const href = a.getAttribute('href') || '';
     if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
       return;
     }

     let itemLogical = a.dataset.route || '';
     if (!itemLogical && window.Router && typeof Router.parsePath === 'function') {
       try {
         const parsed = Router.parsePath(href);
         if (parsed && parsed.route != null) {
           itemLogical = parsed.route;
         }
       } catch (_) {}
     }
     if (!itemLogical) {
       itemLogical = href;
     }

     // Use isRouteActive so that parent items like /news stay active
     // when the user is on a sub-route like /news/some-slug.
     if (isRouteActive(itemLogical, currentLogical)) {
       a.classList.add('active');
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
