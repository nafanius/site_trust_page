# Deployment Fix — "Code runs but site does not update"

## Symptom
- You see the site loading (no JS errors in console)
- Menu / news / pages are not appearing or not changing
- The Apps Script URL works when you add `&callback=xxx` (JSONP)
- Normal requests return Google error HTML

## Root Cause (confirmed on your URL)
The deployed `Code.gs` still contains this line:

```js
output.setHeaders({ ... })
```

In Google Apps Script Web Apps, `ContentService.createTextOutput(...).setHeaders(...)` **frequently throws**:

```
TypeError: output.setHeaders is not a function
```

When this happens, `doGet()` crashes for every normal `fetch()` request and returns an HTML error page instead of JSON.

**JSONP path (`?callback=...`) bypasses `jsonResponse()` completely**, so it still works.

## What was fixed in this workspace

1. `apps-script/Code.gs`
   - Removed all `setHeaders()` calls from `jsonResponse()` and `doOptions()`
   - Added clear comments

2. `js/api.js`
   - Now **always prefers JSONP** when calling `script.google.com/macros`
   - Detects non-JSON responses and falls back automatically
   - Added console logging (`[API] Using JSONP for ...`)

3. Small robustness improvements:
   - Menu items now show a fallback title if translation is empty
   - Page templates are normalized (trim + lowercase + alias handling)

## What you must do RIGHT NOW

### Step 1: Copy the fixed Code.gs

1. Open your Apps Script project.
2. Delete everything in `Code.gs`.
3. Copy the **entire content** of the file:
   ```
   /home/user/PyPro/trust_site_page/apps-script/Code.gs
   ```
   (or the version you have in your local repo)
4. Paste it and save.

### Step 2: Create a NEW deployment (critical)

Do **not** just click "Deploy" → update.

You must do:

1. Top right → **Deploy** → **New deployment**
2. Click the gear icon if needed
3. Type: **Web app**
4. Execute as: **Me**
5. Who has access: **Anyone** (or "Anyone, even anonymous")
6. Click **Deploy**
7. Copy the **new** Web App URL

### Step 3: Update config (if the URL changed)

If the new deployment gave you a different URL, update:

`js/config.js`

```js
API_URL: "https://script.google.com/macros/s/NEW-ID/exec",
```

### Step 4: Hard refresh + check console

- Open the site
- Press `Ctrl + Shift + R` (or `Cmd + Shift + R`)
- Open DevTools → Console
- Look for messages like:
  - `[API] Using JSONP for settings`
  - `[App] Loading settings from API...`
  - `[App] Settings response: ...`

If you see successful JSONP responses but the UI is still empty, tell me what the console shows.

## Quick test (after redeploy)

In browser console run:

```js
fetch('https://script.google.com/macros/s/YOUR-ID/exec?action=settings')
  .then(r => r.text()).then(console.log)
```

It should now return real JSON (not an error page).

## Why this keeps happening

Google Apps Script Web Apps have extremely inconsistent CORS + header support.
The only transport that is consistently reliable is the JSONP (`?callback=`) mechanism.

That is why the frontend now forces JSONP for this API.
