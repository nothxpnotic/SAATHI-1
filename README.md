# SAATHI — Smart AI-Assisted Triage & Healthcare Interface
**Prototype v0.1 | OPD Triage Demo**

---

## Folder Structure
```
saathi/
├── index.html
├── css/style.css
├── js/
│   ├── logic.js   ← Hard-rule triage engine (offline, no API)
│   ├── api.js     ← Gemini 1.5 Flash wrapper
│   └── app.js     ← UI controller + event wiring
└── README.md
```

---

## Running Locally
1. Unzip the folder
2. Open `index.html` in any modern browser (Chrome / Edge recommended)
3. Enter your Gemini API key in the settings modal
4. No build step, no Node.js, no server required

---

## Hosting on GitHub Pages (Free)
1. Create a new GitHub repository (e.g. `saathi-triage`)
2. Upload all files maintaining the folder structure
3. Go to **Settings → Pages → Branch: main → / (root) → Save**
4. Your app is live at: `https://<your-username>.github.io/saathi-triage/`

---

## Hosting on Netlify (Free, faster)
1. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Drag and drop the entire `saathi/` folder onto the Netlify dashboard
3. Done — live URL generated instantly (e.g. `https://saathi-xyz.netlify.app`)
4. For a custom domain: **Domain settings → Add custom domain**

---

## Gemini API Key
- Get a free key at: https://aistudio.google.com/apikey
- The key is stored in **session memory only** — never written to disk
- The app functions fully offline (hard rules only) if no key is provided

---

## Disclaimer
This is a **decision-support prototype** for demonstration purposes only.  
Clinical responsibility remains with the attending physician at all times.  
Not validated for clinical deployment without prospective evaluation.
