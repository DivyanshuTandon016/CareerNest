# CareerNest

Track every application. Grow your career with clarity.

CareerNest is a Chrome-extension-first job application history tracker with:

- A React dashboard for reviewing captured application history.
- A FastAPI REST API backed by SQLite for local development.
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

## Backend

The backend uses SQLModel so the default SQLite setup can move to PostgreSQL later through `DATABASE_URL`.

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

For a future PostgreSQL run, set `DATABASE_URL` to a SQLAlchemy-compatible PostgreSQL URL and install the matching database driver.

## Frontend dashboard

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

The dashboard is pinned to port `5173` and calls `http://localhost:8000` by default. To point it elsewhere, copy `frontend/.env.example` to `frontend/.env.local` and change:

```text
VITE_API_BASE_URL=http://localhost:8000
```

If you deploy the frontend with GitHub Pages, the browser still needs a reachable API. GitHub Pages only serves static files, so it cannot run FastAPI or SQLite by itself.

## Publishing

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that builds `frontend/` and publishes the dashboard to GitHub Pages.

1. Host the backend somewhere that can run Python, such as Render, Railway, Fly.io, or another API host.
2. Set a GitHub repository variable named `VITE_API_BASE_URL` to that backend URL, for example `https://careernest-api.onrender.com`.
3. In GitHub, set **Settings > Pages > Build and deployment > Source** to **GitHub Actions**.
4. Push to `main` or run the **Deploy dashboard to GitHub Pages** workflow manually.

The included `render.yaml` is a Render blueprint for the FastAPI backend plus a PostgreSQL database. After the backend is live, use that backend URL for both:

- GitHub repository variable `VITE_API_BASE_URL`
- Chrome extension popup field **API URL**

The backend allows `https://divyanshutandon016.github.io` by default, and you can add more frontend origins with `CAREERNEST_FRONTEND_ORIGINS`.

## Chrome extension

1. Open Chrome and visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the `extension` folder.
4. Open the CareerNest extension popup.
5. Set **API URL** to your hosted backend URL. For local development, keep `http://localhost:8000`.
6. Apply on a job page. When the extension sees a clear submission confirmation, it saves the job and shows an Undo notice.
7. Refresh the dashboard and confirm the saved job appears in the history with its applied date.

The extension reads visible job page text and common structured job metadata through a content script, then sends captured details to the local API through its Manifest V3 service worker. It does not submit applications, collect passwords, or read cookies. Automatic tracking depends on readable job details and visible confirmation text such as a submitted or received application message.

## Automatic tracking test

1. Start the backend on port `8000`, or configure the extension popup with a hosted backend URL.
2. Load or reload the unpacked `extension` folder in Chrome.
3. Apply on a supported job flow and wait for a visible success message such as an application submitted or received confirmation.
4. Confirm the CareerNest notice appears on the page.
5. Refresh the dashboard and confirm the new row appears in the captured jobs table.

## API example

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/applications `
  -ContentType "application/json" `
  -Body '{"company":"Northstar Labs","role_title":"Software Engineer Intern","location":"Remote","job_url":"https://jobs.example.com/software-engineer-intern","source_site":"jobs.example.com","status":"Applied","date_applied":"2026-05-22","notes":"Captured from a job page."}'
```
