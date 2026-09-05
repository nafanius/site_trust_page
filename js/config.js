/**
 * Developer configuration.
 * Do NOT put CMS content here.
 * Content lives in Google Sheets.
 */
const CONFIG = {
  // Replace with your deployed Google Apps Script Web App URL
  // Example: "https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec"
  API_URL: "https://script.google.com/macros/s/AKfycbws1QCe1ef43fixHcC-nySRsJuA1l56WcJwwsgEFujUuzL2v9NPdNVLbENNLoL1B8z1Mw/exec",

  // Default fallback language if a translation is missing
  FALLBACK_LANGUAGE: "en",

  // Number of news items to show per page (used by news.js)
  NEWS_PER_PAGE: 12
};

// Freeze to prevent accidental mutation in client code
Object.freeze(CONFIG);
