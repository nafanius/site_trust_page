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

| id | slug     | template | image | active | sort |
|----|----------|----------|-------|--------|------|
| 1  | about    | standard |       | TRUE   | 10   |
| 2  | contacts | standard |       | TRUE   | 20   |

---

## 5. `page_translations`

| page_id | lang | title      | content                                      |
|---------|------|------------|----------------------------------------------|
| 1       | en   | About Us   | We are a trusted organization...             |
| 1       | ru   | О нас      | Мы — надежная организация...                 |
| 1       | pl   | O nas      | Jesteśmy zaufaną organizacją...              |
| 2       | en   | Contact Us | Reach us at contact@example.com              |
| 2       | ru   | Контакты   | Напишите нам: contact@example.com            |

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

1. Deploy `apps-script/Code.gs` as a Web App.
2. Copy the Web App URL into `js/config.js`.
3. Push to GitHub and enable GitHub Pages.

Content changes in the spreadsheet will appear on the live site after cache expires (usually within 5 minutes) or on a hard refresh.
