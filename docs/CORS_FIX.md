# Fixing CORS Errors with Google Apps Script Web Apps

## The Problem

You are seeing this error:

```
Access to fetch at 'https://script.google.com/macros/s/.../exec?action=settings' 
from origin 'http://localhost:8080' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This is an extremely common issue with Google Apps Script.

**Google Apps Script Web Apps have very poor and unreliable CORS support**, especially when called from:
- `localhost`
- `127.0.0.1`
- Custom ports
- Sometimes even from GitHub Pages

Adding `Access-Control-Allow-Origin: *` in `setHeaders()` often does **not** work until you do a very specific deployment step.

---

## Solution (Do This Exactly)

### Step 1: Make sure you have the latest Code.gs

The current `apps-script/Code.gs` already includes:
- Proper CORS headers in `jsonResponse()`
- `doOptions()` handler
- Full **JSONP fallback** support

### Step 2: Create a **NEW** Deployment (Most Important Step)

This is the part that fixes it for most people:

1. Go to your Apps Script project: https://script.google.com
2. Open the project that contains `Code.gs`
3. Click **Deploy** (top right) → **New deployment**
4. In the dialog:
   - Click the gear icon if needed
   - **Type**: Web app
   - **Execute as**: Me
   - **Who has access**: Anyone (or "Anyone, even anonymous")
5. Click **Deploy**
6. **Copy the new Web App URL** (it will be different from the old one)

### Step 3: Update the frontend config

1. Open `js/config.js`
2. Replace the `API_URL` with the **new** URL you just copied:

```js
API_URL: "https://script.google.com/macros/s/NEW-DEPLOYMENT-ID/exec",
```

3. Save the file.

### Step 4: Hard refresh your browser

- On `localhost`: Press `Ctrl + Shift + R` (or `Cmd + Shift + R`)
- Or open DevTools → Network tab → check "Disable cache"

---

## How the Project Now Handles CORS

The code has two layers of protection:

1. **Server-side** (`Code.gs`):
   - Returns `Access-Control-Allow-Origin: *` headers
   - Handles `OPTIONS` preflight requests
   - Supports `?callback=xxx` (JSONP)

2. **Client-side** (`js/api.js`):
   - Automatically detects `localhost` / `127.0.0.1`
   - Uses **JSONP** (script tag injection) instead of `fetch()` on localhost
   - On production, tries normal `fetch()`, then falls back to JSONP if CORS fails

This combination makes the site work both during local development and in production.

---

## Quick Test

After redeploying, test directly in your browser:

```
https://script.google.com/macros/s/YOUR-ID/exec?action=settings
```

You should see raw JSON like:

```json
{"success":true,"data":{"site_name":"Trust Site", ...}}
```

If you still get blocked when calling from localhost, the JSONP fallback should kick in automatically.

---

## Still Not Working?

1. Make sure you created a **completely new deployment** (not "Manage deployments" → edit).
2. Make sure you copied the **new** URL into `js/config.js`.
3. Clear browser cache completely.
4. Check the browser console for `[API] fetch() failed, trying JSONP fallback...`

If you see the JSONP fallback message, it means the system is working around the CORS limitation.

---

## Important Notes

- Every time you change `Code.gs`, you usually need to create a **new deployment**.
- Updating an existing deployment often does **not** apply new CORS headers.
- JSONP is used as a reliable fallback and is safe for public read-only data.
