/**
 * Developer configuration.
 * Do NOT put CMS content here.
 * Content lives in Google Sheets.
 */
const CONFIG = {
  // Replace with your deployed Google Apps Script Web App URL
  // Example: "https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec"
  API_URL: "https://script.google.com/macros/s/AKfycbzfd1LKEN-JPXoHC3dbWNyqsgWT10NwoQbC9FBU42sq4Zqrq5pn9UL1qCO7c5fPsi4TsQ/exec",

  //api for form
  API_FORM: "https://script.google.com/macros/s/AKfycbzfd1LKEN-JPXoHC3dbWNyqsgWT10NwoQbC9FBU42sq4Zqrq5pn9UL1qCO7c5fPsi4TsQ/exec",

  // Default fallback language if a translation is missing
  FALLBACK_LANGUAGE: "en",

  // Number of news items to show per page (used by news.js)
  NEWS_PER_PAGE: 12,

  // Number of news items to show per page (used by news.js)
  DOMAIN_NAME: 'https://example.com',

  // Site name for SEO and page title
  SITE_NAME: 'Trust In Poland Legal'

};

// Freeze to prevent accidental mutation in client code
Object.freeze(CONFIG);
