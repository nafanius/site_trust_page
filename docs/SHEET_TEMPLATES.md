# Google Sheets Template — Copy these into your spreadsheet

Create a new Google Spreadsheet and create the following sheets with **exact names**.

---

## 1. `settings`

| key                 | value             |
|---------------------|-------------------|
| site_name           | Trust Site        |
| default_language    | en                |
| available_languages | en,ru,pl          |
| fallback_language   | en                |
| news_per_page       | 12                |
| maintenance         | false             |

---

## 2. `news`

| id | slug          | date       | category | image | link              | active | sort |
|----|---------------|------------|----------|-------|-------------------|--------|------|
| 1  | welcome       | 2026-09-05 | news     |       | /news/welcome     | TRUE   | 100  |
| 2  | new-partner   | 2026-08-20 | updates  |       | /news/new-partner | TRUE   | 90   |

---

## 3. `news_translations`

| news_id | lang | title             | text                                      | button    |
|---------|------|-------------------|-------------------------------------------|-----------|
| 1       | en   | Welcome           | We are excited to launch our new site.    | Read more |
| 1       | ru   | Добро пожаловать  | Мы рады запустить наш новый сайт.         | Подробнее |
| 1       | pl   | Witamy            | Z radością uruchamiamy naszą nową stronę. | Czytaj    |
| 2       | en   | New Partner       | We have partnered with Example Corp.      | Learn more|
| 2       | ru   | Новый партнёр     | Мы заключили партнёрство с Example Corp.  | Узнать    |

---

## 4. `pages`

| id | slug      | template | image | meta_description                          | og_image | active | sort |
|----|-----------|----------|-------|-------------------------------------------|----------|--------|------|
| 1  | about     | standard |       | Learn more about our mission and values.  |          | TRUE   | 10   |
| 2  | contacts  | contact  |       | Get in touch with our team.               |          | TRUE   | 20   |
| 3  | home      | standard |       | Welcome to our multilingual site.         |          | TRUE   | 5    |
| 4  | services  | rich     |       | Explore our full range of professional services. |   | TRUE   | 30   |
| 5  | news      | standard |       | Latest company news and updates           |          | TRUE   | 40   |

> The `news` row (slug = `news`) is special: its title + lead/subtitle from `page_translations` become the header of the **News listing page** (`/news`, `/ru/news` etc.).

**Supported templates** (set in the `template` column):

- `standard` — Classic page with title + image + content (default). Good semantic `<article>` + headings.
- `landing` — Hero section + lead text + body + CTA. Excellent for high-conversion / SEO landing pages.
- `contact` — Two-column layout (info + form). Good for contact / about pages.
- `rich` (or `article`) — Featured image + rich article layout. Best for long-form SEO content.

All templates use:
- Semantic HTML (`<article>`, `<header>`, `<section>`, proper `h1`–`h2`)
- Dynamic `<meta name="description">` + Open Graph tags (from `meta_description` / `og_image`)
- Clean structure for crawlers

**SEO columns** (add these to your `pages` sheet — highly recommended):
- `meta_description` — Used for `<meta name="description">` and social cards (max ~160 chars)
- `og_image` — Open Graph / Twitter image URL (falls back to `image` column)

---

## 5. `page_translations`

**Core columns** (required for basic pages):

| page_id | lang | title          | content                                      |
|---------|------|----------------|----------------------------------------------|
| 1       | en   | About Us       | We are a trusted organization...             |
| 1       | ru   | О нас          | Мы — надежная организация...                 |
| 1       | pl   | O nas          | Jesteśmy zaufaną organizacją...              |
| 2       | en   | Contact Us     | Reach us at contact@example.com              |
| 2       | ru   | Контакты       | Напишите нам: contact@example.com            |
| 3       | en   | Welcome        | Discover our multilingual platform...        |
| 4       | en   | Our Services   | We offer consulting, development and support.|

**Rich translatable columns** (add any of these to `page_translations` — they are passed through automatically and can be used by templates):

These columns are **fully translated** per language row. Add them only to the `page_translations` sheet (not `pages`).

Useful columns you can add right now (examples for contacts page):

- `lead` or `subtitle` — short lead text under the main title
- `info_title` — heading for the left "Contact Information" block
- `form_title` — heading for the form block
- `contact_email`, `contact_phone`, `address` — dynamic contact details
- `form_note` — small note under the form
- `submit_label` or `button` — text on the submit button
- `extra_content` or `extra` — additional translated text block (shown after main content on standard pages)

Example for contacts (page_id = 2):

| page_id | lang | title       | content                        | lead                        | info_title          | form_title       | contact_email          | contact_phone     | address                  | submit_label | form_note                              |
|---------|------|-------------|--------------------------------|-----------------------------|---------------------|------------------|------------------------|-------------------|--------------------------|--------------|----------------------------------------|
| 2       | en   | Contact Us  | Our team is here to help...    | We reply within 24 hours    | Contact Information | Send us a message| info@trustsite.example | +1 (000) 000-0000 | 123 Main St, City        | Send Message | This form is a demo. Use your own.   |
| 2       | ru   | Контакты    | Наша команда готова помочь...  | Отвечаем в течение 24 часов | Контактная информация | Напишите нам     | info@trustsite.example | +7 (000) 000-00-00| ул. Главная 123, Город   | Отправить    | Это демо-форма. Подключите свою.     |
| 2       | pl   | Kontakt     | Nasz zespół jest gotowy pomóc...| Odpowiadamy w 24h           | Informacje kontaktowe | Wyślij wiadomość | info@trustsite.example | +48 000 000 000   | ul. Główna 123, Miasto   | Wyślij       | To jest formularz demo.                |

### News listing page header (`/news`) from Google Sheets

The header (title + lead text) of the **News listing** (`/news`, `/ru/news`, `/pl/news`) is now loaded from a page with `slug = "news"`.

**What to add in Google Sheets:**

1. In sheet `pages` add (or update) a row:

   | id | slug | template | image | meta_description          | active | sort |
   |----|------|----------|-------|---------------------------|--------|------|
   | 5  | news | standard |       | Latest company news       | TRUE   | 40   |

2. In sheet `page_translations` add rows for each language (you can use the rich columns):

   | page_id | lang | title     | content | lead                          | subtitle                     |
   |---------|------|-----------|---------|-------------------------------|------------------------------|
   | 5       | en   | News      |         | Latest updates and articles   | Company announcements        |
   | 5       | ru   | Новости   |         | Последние обновления и статьи | Анонсы компании              |
   | 5       | pl   | Aktualności |       | Najnowsze aktualizacje        | Ogłoszenia firmy             |

The `title` becomes the `<h1>`, `lead` or `subtitle` becomes the lead paragraph under it.

If the "news" page row does not exist, the site falls back to a static "News" header (backward compatible).

---

### Contacts page (`/contacts`) — rich translatable fields

The contacts page (`slug = "contacts"`, template usually `contact`) supports many additional translatable columns in `page_translations`.

See the example table above in the "Rich translatable columns" section.

All extra columns you add to `page_translations` (for any page) are automatically available in the templates.

All these extra columns are **optional**. The site will gracefully fall back to sensible defaults when they are empty.

---

## Homepage (главная страница) из Google Sheets

Главная страница (`/`, `/ru/`, `/pl/`) теперь тоже может полностью загружаться из листов `pages` + `page_translations`.

### Что нужно поменять в Google Sheets (инструкция)

1. **Лист `pages`** — добавь (или измени) строку со `slug = home`:

   | id | slug | template | image | meta_description             | active | sort |
   |----|------|----------|-------|------------------------------|--------|------|
   | 10 | home | standard |       | Welcome to our site          | TRUE   | 1    |

   > Важно: `slug` **должен быть ровно** `home` (не `home-hero`, не `index`).

2. **Лист `page_translations`** — добавь переводы для этой страницы:

   | page_id | lang | title              | content                                           |
   |---------|------|--------------------|---------------------------------------------------|
   | 10      | en   | Welcome            | This is the main page. Edit this in Google Sheets.|
   | 10      | ru   | Добро пожаловать   | Это главная страница. Редактируйте в Google Sheets.|
   | 10      | pl   | Witamy             | To jest strona główna. Edytuj w Google Sheets.    |

3. (Опционально) Добавь `image`, `meta_description`, `og_image` в лист `pages` для главной страницы.

### Как это работает
- Сайт при загрузке главной запрашивает `action=page&slug=home&lang=...`
- Если запись найдена — показывает title + content + image из таблицы (с правильным переводом).
- Если страницы `home` нет — работает по-старому (из `settings.home_description`).

После изменений в таблице обновления появятся на сайте (с учётом кэша 6 часов или после жёсткого обновления).

---

**Ранее использовался пример `home-hero`** — его можно оставить или удалить. Главная теперь специально использует slug `home`.

---

## 6. `menu`

| id | parent_id | type     | url      | sort | active |
|----|-----------|----------|----------|------|--------|
| 1  | 0         | page     | /about   | 10   | TRUE   |
| 2  | 0         | page     | /news    | 20   | TRUE   |
| 3  | 0         | dropdown | #        | 30   | TRUE   |
| 4  | 3         | page     | /services| 10   | TRUE   |

---

## 7. `menu_translations`

| menu_id | lang | title      |
|---------|------|------------|
| 1       | en   | About      |
| 1       | ru   | О нас      |
| 1       | pl   | O nas      |
| 2       | en   | News       |
| 2       | ru   | Новости    |
| 2       | pl   | Aktualności|
| 3       | en   | More       |
| 3       | ru   | Ещё        |
| 4       | en   | Services   |
| 4       | ru   | Услуги     |

---

## Optional: `categories` + `category_translations`

| id | slug | active |
|----|------|--------|
| 1  | news | TRUE   |

| category_id | lang | title |
|-------------|------|-------|
| 1           | en   | News  |
| 1           | ru   | Новости |

---

## After filling the sheets

1. Deploy `apps-script/Code.gs` as a Web App (Execute as: Me, Access: Anyone).
2. Copy the Web App URL into `js/config.js` (`API_URL`).
3. (Recommended) Update `robots.txt` and `sitemap.xml` with your real GitHub Pages domain.
4. Push everything to GitHub and enable GitHub Pages.

**Cache note**: The backend now caches responses for **6 hours** (`CacheService`). Changes in Google Sheets may take up to 6 hours to appear (or force a hard refresh / clear cache manually).

Content changes in the spreadsheet will appear on the live site after cache expires.

## New SEO & Template Features

- Multiple page templates: `standard`, `landing`, `contact`, `rich`
- Automatic `<meta name="description">` + Open Graph tags from `meta_description` and `og_image` columns
- Semantic HTML (`<article>`, proper headings, sections)
- `robots.txt` and `sitemap.xml` included at the root (update the domain!)
- Cache increased to 6 hours for better performance

