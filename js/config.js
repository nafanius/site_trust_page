/**
 * Developer configuration.
 * Do NOT put CMS content here.
 * Content lives in Google Sheets.
 */
const CONFIG = {
  // Replace with your deployed Google Apps Script Web App URL
  // Example: "https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec"
  API_URL: "https://script.google.com/macros/s/AKfycbzI9ilxVTNevM5n8TaP3qCBfbKQ1s8TCjfIAoMpItRh8KkcIXBQ3nmb6My43cniO0qIVA/exec",

  //api for form
  API_FORM: "https://script.google.com/macros/s/AKfycby_SJHjTqM9iJONRmgWaWh2igXsAKMrETDqtp7BzVDyBEcSWEljm6wCcSTiGQvhus8N8g/exec",

  // Default fallback language if a translation is missing
  FALLBACK_LANGUAGE: "en",

  // Number of news items to show per page (used by news.js)
  NEWS_PER_PAGE: 12
};

// Freeze to prevent accidental mutation in client code
Object.freeze(CONFIG);
