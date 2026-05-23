# CareerNest

Track every application. Grow your career with clarity.

CareerNest is a Chrome-extension-first job application history tracker with:

- A React dashboard for reviewing captured application history.
- Free Chrome extension storage for the published dashboard.
- An optional FastAPI REST API backed by SQLite for local development.
- A Manifest V3 Chrome extension that remembers visible job page details and saves the job after a submitted confirmation is detected.

GitHub repository: https://github.com/DivyanshuTandon016/CareerNest

GitHub Pages dashboard: https://divyanshutandon016.github.io/CareerNest/

Local dashboard: http://localhost:5173

## Project structure

```text
CareerNest/
  backend/
    app/
      routes/
      database.py
      main.py
      models.py
      schemas.py
      seed.py
    requirements.txt
  extension/
    background.js
    contentScript.js
    manifest.json
    popup.css
    popup.html
    popup.js
    icons/
  frontend/
    src/
    package.json
```

## Free Published Setup

The free setup uses:

- GitHub Pages for the dashboard.
- Chrome extension storage for saved applications.
- No paid backend, no hosted database, and no local terminal after setup.

Leave the extension popup's **Optional API URL** blank. The dashboard at `https://divyanshutandon016.github.io/CareerNest/` reads saved jobs through the installed CareerNest extension.

## Optional Local Backend

The backend is only needed if you want local API development. The free published setup does not require it.

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\python -m pip install -r requirements.txt
..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

Useful endpoints:

- `GET /health`
- `GET /applications`
- `POST /applications`
- `GET /applications/{id}`
- `PATCH /applications/{id}`
- `DELETE /applications/{id}`
- `GET /applications/stats/summary`

Sample applications are off by default so the dashboard starts with real captured history only. Set `CAREERNEST_SEED_SAMPLE=true` before launching the backend only if you want demo rows.

## Frontend dashboard

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

By default, the dashboard uses extension storage. To force the optional local backend, copy `frontend/.env.example` to `frontend/.env.local` and change:

```text
VITE_API_BASE_URL=http://localhost:8000
```

If `VITE_API_BASE_URL` is empty or unset, the dashboard uses free extension/local browser storage.

## Publishing

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that builds `frontend/` and publishes the dashboard to GitHub Pages.

1. In GitHub, set **Settings > Pages > Build and deployment > Source** to **GitHub Actions**.
2. Push to `main` or run the **Deploy dashboard to GitHub Pages** workflow manually.
3. Open `https://divyanshutandon016.github.io/CareerNest/`.

Do not set `VITE_API_BASE_URL` if you want the free storage mode.

## Chrome extension

1. Open Chrome and visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the `extension` folder.
4. Open the CareerNest extension popup.
5. Leave **Optional API URL** blank for free Chrome storage.
6. Apply on a job page. When the extension sees a clear submission confirmation, it saves the job and shows an Undo notice.
7. Refresh the dashboard and confirm the saved job appears in the history with its applied date.

The extension reads visible job page text and common structured job metadata through a content script, then saves captured details through its Manifest V3 service worker. It does not submit applications, collect passwords, or read cookies. Automatic tracking depends on readable job details and visible confirmation text such as a submitted or received application message.

## Automatic tracking test

1. Load or reload the unpacked `extension` folder in Chrome.
2. Leave **Optional API URL** blank in the extension popup.
3. Apply on a supported job flow and wait for a visible success message such as an application submitted or received confirmation.
4. Confirm the CareerNest notice appears on the page.
5. Refresh the dashboard and confirm the new row appears in the captured jobs table.

## API example

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/applications `
  -ContentType "application/json" `
  -Body '{"company":"Northstar Labs","role_title":"Software Engineer Intern","location":"Remote","job_url":"https://jobs.example.com/software-engineer-intern","source_site":"jobs.example.com","status":"Applied","date_applied":"2026-05-22","notes":"Captured from a job page."}'
```
