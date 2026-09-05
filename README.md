# Trust Site Page — Multilingual Static Website with Google Sheets CMS

Production-ready multilingual static website using:

- **GitHub Pages** for static hosting
- **HTML + CSS + Vanilla JavaScript** (no frameworks)
- **Google Sheets** as the CMS / source of truth
- **Google Apps Script** as a JSON API
- Path-based language routing (`/ru/news`, `/pl/about`, etc.)

**Core rule**: After initial setup, content managers edit **only Google Sheets**. No GitHub edits required for normal content updates.

---

## URL Architecture

- English (default): `/`, `/news`, `/about`
- Other languages: `/ru/`, `/ru/news`, `/pl/about`
- Never use query params for language in public URLs

---

## Project Structure

```
index.html
404.html                 # SPA fallback for deep links on GitHub Pages
css/
  style.css
  header.css
  news.css
  responsive.css
js/
  config.js              # API_URL and dev settings (edit this once)
  router.js
  api.js
  i18n.js
  menu.js
  news.js
  pages.js
  main.js
assets/
  logo.svg
apps-script/
  Code.gs                # Google Apps Script backend (deploy separately)
README.md
```

---

## Quick Start

### ⚠️ Critical: Google Apps Script Deployment (CORS)

Google Apps Script Web Apps have **very strict CORS rules**.

**Every time you change `apps-script/Code.gs` you must:**

1. Go to **Deploy → New deployment** (not "Manage deployments")
2. Choose **Web app**
3. Set **Execute as: Me**, **Who has access: Anyone**
4. Deploy and **copy the NEW URL**
5. Paste it into `js/config.js` → `API_URL`
6. Hard-refresh the browser (`Ctrl+Shift+R`)

See [docs/CORS_FIX.md](docs/CORS_FIX.md) for full troubleshooting.

The project already includes:
- Proper CORS headers + `doOptions()`
- Automatic JSONP fallback (works on localhost)

---

### 1. Create the Google Sheet (CMS)

1. Create a new Google Spreadsheet.
2. Rename the default sheet or create these sheets exactly:

Required sheets:
- `settings`
- `menu`
- `menu_translations`
- `news`
- `news_translations`
- `pages`
- `page_translations`

Optional (recommended):
- `categories`
- `category_translations`

#### Sheet: `settings`

| key                   | value                  |
|-----------------------|------------------------|
| site_name             | Trust Site             |
| default_language      | en                     |
| available_languages   | en,ru,pl               |
| fallback_language     | en                     |
| news_per_page         | 12                     |
| maintenance           | false                  |

#### Sheet: `news`

| id | slug          | date       | category | image | link                  | active | sort |
|----|---------------|------------|----------|-------|-----------------------|--------|------|
| 1  | new-website   | 2026-09-05 | news     |       | /news/new-website     | TRUE   | 100  |

#### Sheet: `news_translations`

| news_id | lang | title          | text                              | button    |
|---------|------|----------------|-----------------------------------|-----------|
| 1       | en   | New website    | We launched our new website.      | Read more |
| 1       | ru   | Новый сайт     | Мы запустили наш новый сайт.      | Подробнее |
| 1       | pl   | Nowa strona    | Uruchomiliśmy naszą nową stronę.  | Czytaj    |

#### Sheet: `pages`

| id | slug    | template | image | active | sort |
|----|---------|----------|-------|--------|------|
| 1  | about   | standard |       | TRUE   | 10   |
| 2  | contacts| standard |       | TRUE   | 20   |

#### Sheet: `page_translations`

| page_id | lang | title     | content                                      |
|---------|------|-----------|----------------------------------------------|
| 1       | en   | About us  | Welcome to our website...                    |
| 1       | ru   | О нас     | Добро пожаловать на наш сайт...              |
| 2       | en   | Contacts  | Get in touch with us...                      |

#### Sheet: `menu`

| id | parent_id | type     | url     | sort | active |
|----|-----------|----------|---------|------|--------|
| 1  | 0         | page     | /about  | 10   | TRUE   |
| 2  | 0         | page     | /news   | 20   | TRUE   |
| 3  | 0         | dropdown | #       | 30   | TRUE   |
| 4  | 3         | page     | /services | 10 | TRUE   |

#### Sheet: `menu_translations`

| menu_id | lang | title     |
|---------|------|-----------|
| 1       | en   | About     |
| 1       | ru   | О нас     |
| 2       | en   | News      |
| 2       | ru   | Новости   |

See the full schema in the skill documentation for more details.

### 2. Deploy the Google Apps Script API

1. Go to [script.google.com](https://script.google.com) → New project.
2. Delete default code and paste the entire contents of `apps-script/Code.gs`.
3. Save the project (give it a name, e.g. "TrustSiteCMS").
4. Click **Deploy** → **New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (or "Anyone, even anonymous" for public site)
5. Click **Deploy** and **copy the Web App URL**.
6. Paste this URL into `js/config.js` as `API_URL`.

**Important**: After any code change to Apps Script, you must create a **new deployment version** (or use "Manage deployments" → edit the existing one).

### 3. Configure the Frontend

Edit `js/config.js` and set your `API_URL`.

### 4. Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to repository **Settings** → **Pages**.
3. Source: **Deploy from a branch** → `main` (or `gh-pages`) → `/ (root)`.
4. Save.

The site will be available at `https://<user>.github.io/<repo>/`.

### 5. Test the Routes

Visit:
- `/`
- `/news`
- `/about`
- `/ru/`
- `/ru/news`
- `/pl/about`

Language switcher should preserve the current route.

---

## Adding Content (No GitHub Required)

1. Add a row to `news`.
2. Add translation rows to `news_translations`.
3. Save the Sheet.

After cache expires (or on next load if cache is cold), the new content appears.

Same for pages and menu.

---

## Architecture Highlights

- Router parses `window.location.pathname` → `{ language, route }`
- All content comes from the Apps Script API
- Translation selection + fallback happens in the backend
- `CacheService` is used for performance (language-aware keys)
- `404.html` enables deep linking on GitHub Pages (SPA-style)
- Centralized `localizedUrl(path, language)` for all URL generation
- Clean separation: GitHub = code, Sheets = content

## SEO & Performance

- Multiple SEO-optimized templates: `standard`, `landing`, `contact`, `rich`
- Automatic `<meta name="description">`, Open Graph tags, and proper heading structure
- `robots.txt` + `sitemap.xml` included at the root
- Backend caching set to **6 hours** (`CacheService.getScriptCache()`)
- Semantic HTML (`<article>`, sections, correct heading hierarchy)
- Language-aware URLs for international SEO

---

## Development Tips

- Open `index.html` locally (some features require the API to be reachable).
- Use browser dev tools → Network to inspect API calls.
- To clear Apps Script cache during development, temporarily change a setting or redeploy.
- For production, keep `NEWS_PER_PAGE` reasonable.

---

## Definition of Done Checklist

- [x] `/`, `/news`, `/about`, `/ru/news`, `/pl/about` all work
- [x] Language switcher preserves route
- [x] Content changes in Sheets appear without GitHub deploy
- [x] Missing translations fall back correctly
- [x] API returns clean JSON objects (not raw sheet rows)
- [x] Cache improves speed (now 6 hours)
- [x] Deep links work via 404.html fallback
- [x] Adding a language only requires adding rows + updating settings
- [x] Adding news/pages/menu only requires Sheet edits
- [x] Multiple SEO-friendly templates (`standard`, `landing`, `contact`, `rich`)
- [x] `robots.txt` + `sitemap.xml` included
- [x] Automatic meta description + Open Graph tags from Sheets

---

## License

MIT or your preferred license.
