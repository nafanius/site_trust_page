---
name: multilingual-sheets-cms
description: Build and maintain a multilingual static website hosted on GitHub Pages with Google Sheets as the CMS, Google Apps Script as a JSON API, and path-based language routing. Use this skill whenever developing, modifying, debugging, or extending this architecture.
---

# Multilingual Google Sheets CMS

## Purpose

This skill defines the architecture and development rules for a multilingual static website using:

- GitHub Pages
- HTML/CSS/Vanilla JavaScript
- Google Sheets as the CMS and source of truth
- Google Apps Script Web App as the backend/API
- Browser `fetch()` for API communication

The core principle is:

> GitHub contains application code. Google Sheets contains editable content.

After the initial deployment, normal content management must never require editing GitHub.

---

## 1. Core architecture

Use this flow:

    Administrator
         |
         v
    Google Sheets
         |
         v
    Google Apps Script
         |
         | JSON
         v
    GitHub Pages frontend
         |
         v
    Visitor

GitHub Pages is static hosting only.

Google Sheets is the CMS.

Apps Script is the API.

Do not introduce another backend unless explicitly requested.

---

## 2. Content management rule

After initial setup, the content administrator must be able to manage the site entirely from Google Sheets.

The administrator must NOT need to edit:

- HTML
- CSS
- JavaScript
- GitHub repository
- Apps Script code

for normal content operations.

The following must be editable through Google Sheets:

- news
- news translations
- pages
- page translations
- menu
- menu translations
- categories
- category translations
- selected site settings
- image URLs
- internal/external links

Adding or editing normal content must not require a GitHub deployment.

---

## 3. URL architecture

Use path-based language routing.

English is the default language and has no prefix.

English:

    /
    /news
    /about
    /contacts

Russian:

    /ru/
    /ru/news
    /ru/about
    /ru/contacts

Polish:

    /pl/
    /pl/news
    /pl/about
    /pl/contacts

General rule:

    /<route>                 -> English
    /<language>/<route>      -> specified language

Never use a public language query parameter such as:

    /news?lang=ru

Use:

    /ru/news

Do not create `/en/news` unless explicitly required.

---

## 4. Router contract

The frontend router must parse:

    window.location.pathname

and return:

    {
        language: "ru",
        route: "/news"
    }

Examples:

    /
        -> { language: "en", route: "/" }

    /news
        -> { language: "en", route: "/news" }

    /ru
        -> { language: "ru", route: "/" }

    /ru/news
        -> { language: "ru", route: "/news" }

    /pl/about
        -> { language: "pl", route: "/about" }

The router must distinguish a language prefix from the actual route.

---

## 5. Localized URL generation

Centralize URL generation in one function:

    localizedUrl(path, language)

Rules:

    localizedUrl("/news", "en")
        -> "/news"

    localizedUrl("/news", "ru")
        -> "/ru/news"

    localizedUrl("/about", "pl")
        -> "/pl/about"

Do not manually concatenate language prefixes throughout the application.

---

## 6. Language switcher

The language switcher must preserve the current logical route.

Examples:

Current:

    /ru/news

Switch to English:

    /news

Switch to Polish:

    /pl/news

Current:

    /news

Switch to Russian:

    /ru/news

Current:

    /pl/about

Switch to Russian:

    /ru/about

If an equivalent page does not exist, use the configured fallback strategy and document the behavior.

---

## 7. Google Sheets schema

Use normalized tables.

Required sheets:

    settings
    menu
    menu_translations
    news
    news_translations
    pages
    page_translations

Optional:

    categories
    category_translations

Do not create language-specific columns such as:

    en_title
    ru_title
    pl_title

Instead use rows in translation tables.

Adding a new language must not require a schema change.

---

## 8. Sheet: settings

Columns:

    key
    value

Example:

    site_name              My Website
    default_language       en
    available_languages    en,ru,pl
    fallback_language      en
    news_per_page          12
    maintenance            false

The frontend may load settings through the API.

The list of available languages should preferably be controlled from settings rather than hardcoded in multiple frontend modules.

---

## 9. Sheet: news

Language-independent fields:

    id
    slug
    date
    category
    image
    link
    active
    sort

Example:

    1
    new-website
    2026-09-05
    news
    https://cdn.example.com/news/1.jpg
    /news/new-website
    TRUE
    100

Do not put translated title/text in this sheet.

---

## 10. Sheet: news_translations

Columns:

    news_id
    lang
    title
    text
    button

Example:

    1 | en | New website | We launched our new website. | Read more
    1 | ru | Новый сайт | Мы запустили наш новый сайт. | Подробнее
    1 | pl | Nowa strona | Uruchomiliśmy naszą nową stronę. | Czytaj

One news item may have many translations.

---

## 11. Sheet: pages

Columns:

    id
    slug
    template
    image
    active
    sort

Example:

    1 | about | standard | | TRUE | 10
    2 | contacts | standard | | TRUE | 20

The frontend should render pages based on their slug/template rather than requiring a new HTML file for every page.

---

## 12. Sheet: page_translations

Columns:

    page_id
    lang
    title
    content

Example:

    1 | en | About us | Welcome to our website...
    1 | ru | О нас | Добро пожаловать...
    1 | pl | O nas | Witamy...

---

## 13. Sheet: menu

Columns:

    id
    parent_id
    type
    url
    sort
    active

Support:

- normal links
- dropdown items
- nested items

Example:

    1 | 0 | page     | /about    | 10 | TRUE
    2 | 0 | page     | /news     | 20 | TRUE
    3 | 0 | dropdown | #         | 30 | TRUE
    4 | 3 | page     | /services | 10 | TRUE

---

## 14. Sheet: menu_translations

Columns:

    menu_id
    lang
    title

Example:

    1 | en | About
    1 | ru | О нас
    1 | pl | O nas

Menu structure and translated labels must remain separate.

---

## 15. Categories

If category labels need translations, use:

`categories`:

    id
    slug
    active

`category_translations`:

    category_id
    lang
    title

Do not duplicate translated category names inside every news record.

---

## 16. Apps Script API

Apps Script is the backend.

Use a central router:

    doGet(e)

Supported actions:

    ?action=settings
    ?action=news&lang=ru
    ?action=news&id=1&lang=ru
    ?action=news&slug=new-website&lang=ru
    ?action=page&slug=about&lang=ru
    ?action=menu&lang=ru

Keep routing separate from business/data logic.

Recommended functions:

    doGet()
    getNews()
    getNewsById()
    getNewsBySlug()
    getPage()
    getMenu()
    getSettings()
    sheetToObjects()
    jsonResponse()

Do not put all logic into `doGet()`.

---

## 17. API response contract

Success:

    {
        "success": true,
        "data": ...
    }

Error:

    {
        "success": false,
        "error": "Error message"
    }

The frontend must always check `success`.

The API should return frontend-friendly objects instead of exposing raw Sheet structures.

Example news object:

    {
        "id": 1,
        "slug": "new-website",
        "date": "2026-09-05",
        "category": "news",
        "image": "https://...",
        "link": "/news/new-website",
        "title": "New website",
        "text": "We launched...",
        "button": "Read more"
    }

---

## 18. Translation selection

The API is responsible for selecting the requested translation.

For:

    ?action=news&lang=ru

return the Russian title/text/button.

The frontend should not receive every language and decide which translation to display.

This keeps the database implementation hidden from the frontend.

---

## 19. Translation fallback

Implement automatic fallback.

Default:

    requested language
        |
        v
    requested translation exists?
       /      yes  no
      |    |
      v    v
    use   fallback language
             |
             v
        translation exists?
           /          yes  no
          |    |
          v    v
        use   omit/handle content

The fallback language should be configurable from `settings`.

Optionally include metadata:

    {
        "requestedLanguage": "ru",
        "language": "en",
        "fallback": true
    }

---

## 20. CacheService

Use Apps Script:

    CacheService.getScriptCache()

Google Sheets remains the source of truth.

Cache is only a performance optimization.

Use language-aware keys:

    news_en
    news_ru
    news_pl

    menu_en
    menu_ru
    menu_pl

Use similar keys for pages/settings where useful.

Never treat CacheService as permanent storage.

The application must work correctly when the cache is empty or expired.

Because content changes relatively rarely, caching is strongly recommended.

---

## 21. Frontend API layer

All Apps Script communication must be centralized in `api.js`.

Do not scatter `fetch()` calls across components.

Recommended interface:

    API.settings()
    API.news(language)
    API.newsById(id, language)
    API.newsBySlug(slug, language)
    API.page(slug, language)
    API.menu(language)

Use `URLSearchParams`.

Handle:

- network errors
- HTTP errors
- invalid JSON
- API-level errors
- empty responses

---

## 22. Recommended frontend structure

Use:

    index.html
    404.html

    css/
        style.css
        header.css
        news.css
        responsive.css

    js/
        config.js
        router.js
        api.js
        i18n.js
        menu.js
        news.js
        pages.js
        main.js

    assets/
        logo.svg
        icons/

Responsibilities:

### config.js

Developer configuration such as:

    API_URL

Do not store CMS content here.

### router.js

URL parsing and route handling.

### api.js

Apps Script communication.

### i18n.js

Language handling and localized URLs.

### menu.js

Menu retrieval/rendering.

### news.js

News retrieval/rendering.

### pages.js

Dynamic page retrieval/rendering.

### main.js

Application initialization and route dispatch.

---

## 23. GitHub Pages deep links

GitHub Pages is static and does not provide normal server-side rewrite rules.

Use `404.html` as a fallback for routes such as:

    /ru/news
    /pl/about

The original browser URL must remain visible.

The application must parse the original pathname and render the correct route.

Do not redirect every unknown route to `/`.

The frontend should behave like a lightweight SPA while remaining deployable as static files.

---

## 24. Internal links

Internal links stored in Sheets may look like:

    /news/new-website

Generate localized URLs:

    /news/new-website
    /ru/news/new-website
    /pl/news/new-website

External URLs such as:

    https://example.org/article

must remain unchanged.

Centralize internal/external URL handling.

---

## 25. Images

Store image URLs in Google Sheets.

Do not store binary image data in cells.

Example:

    https://cdn.example.com/images/news-1.jpg

Use:

    loading="lazy"

for suitable content images.

The image host should be independent of GitHub content management.

---

## 26. HTML safety

Google Sheets is editable content and must not be assumed safe.

Prefer DOM APIs where practical.

If using `innerHTML`, implement:

    escapeHtml()

Escape at minimum:

    &
    <
    >
    "
    '

Never allow spreadsheet values to become executable JavaScript.

If rich HTML content is intentionally supported in `page_translations.content`, sanitize/allowlist it explicitly rather than blindly trusting all spreadsheet content.

---

## 27. SEO

Support language-aware HTML:

    <html lang="ru">

For translated pages, use appropriate:

    canonical
    hreflang

Examples:

    /news
    /ru/news
    /pl/news

Use:

    hreflang="en"
    hreflang="ru"
    hreflang="pl"

where appropriate.

Do not create duplicate English URLs with `/en/`.

---

## 28. Adding a new language

Adding `de` should require only:

1. Add `de` to the configured available languages.
2. Add German translation rows in translation sheets.

It must NOT require:

- new HTML files
- new JS files
- database schema changes
- language-specific frontend code
- GitHub content edits

If adding a language requires code changes, review the architecture.

---

## 29. Adding a news item

Administrator workflow:

1. Add one row to `news`.
2. Add translation rows to `news_translations`.
3. Save the spreadsheet.

The site must automatically display the content after cache expiration or cache refresh.

No GitHub deployment is required.

---

## 30. Adding a page

Administrator workflow:

1. Add a row to `pages`.
2. Add translation rows to `page_translations`.
3. Save the spreadsheet.

The frontend should render the page from its slug/template.

No new HTML file should be required for normal CMS pages.

---

## 31. Error handling

Handle gracefully:

- API unavailable
- Apps Script errors
- invalid JSON
- missing translation
- missing image
- missing page
- unknown route
- empty news list

Never leave the user with a blank page.

Provide a useful loading/error/404 state.

---

## 32. Content vs application code

### Content belongs in Google Sheets

- titles
- text
- news
- images
- links
- pages
- translations
- menu labels
- category labels
- editable site settings

### Application code belongs in GitHub

- routing
- rendering
- API client
- CSS
- JavaScript
- HTML shell
- application behavior

Do not move CMS content into JavaScript constants for convenience.

---

## 33. Anti-patterns

Do NOT:

- hardcode news in HTML
- hardcode translated menu labels in JavaScript
- store all CMS content in JavaScript
- create one HTML page per language
- require GitHub edits for news updates
- use `/news?lang=ru` as the public language URL
- create `en_title`, `ru_title`, `pl_title` columns
- expose raw Sheet structure to the frontend
- rely permanently on CacheService
- put all business logic into `doGet()`
- blindly inject Sheet values into HTML
- create separate frontend logic for every language
- require code changes to add normal content

---

## 34. Definition of Done

An implementation is complete only if all of these work:

    /
    /news
    /about

    /ru/
    /ru/news
    /ru/about

    /pl/
    /pl/news
    /pl/about

The language switcher preserves the current logical route.

Google Sheets changes appear on the site without GitHub changes.

Missing translations use fallback.

The API returns predictable JSON.

Apps Script cache improves performance without affecting correctness.

GitHub Pages deep links work.

Adding another language does not require frontend code changes.

Adding a news item does not require frontend code changes.

Adding a translation does not require frontend code changes.

Adding a normal CMS page does not require creating an HTML file.

The content manager can operate entirely from Google Sheets.

---

## 35. Implementation preference

When multiple solutions are possible, prefer the simplest solution that preserves the architecture.

Priority order:

1. Google Sheets remains the CMS.
2. GitHub remains static frontend hosting.
3. Language remains part of the URL path.
4. Apps Script hides the database implementation.
5. Translation tables remain normalized.
6. Fallback is automatic.
7. Cache improves performance but is never authoritative.
8. Frontend remains framework-free unless explicitly requested.
9. Deep links work on GitHub Pages.
10. SEO remains language-aware.
11. Normal content changes never require GitHub changes.
