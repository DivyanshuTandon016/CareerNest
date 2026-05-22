# CareerNest

Track every application. Grow your career with clarity.

CareerNest is a full-stack job application tracking MVP with:

- A React dashboard for reviewing, filtering, adding, editing, and deleting applications.
- A FastAPI REST API backed by SQLite for local development.
- A Manifest V3 Chrome extension that detects visible job page details and saves only when the user clicks **Save Application**.

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

Sample applications are inserted the first time an empty local database starts. Set `CAREERNEST_SEED_SAMPLE=false` before launching the backend if you want a blank database.

For a future PostgreSQL run, set `DATABASE_URL` to a SQLAlchemy-compatible PostgreSQL URL and install the matching database driver.

## Frontend dashboard

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

The dashboard calls `http://localhost:8000` by default. To point it elsewhere, create `frontend/.env.local` with:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## Chrome extension

1. Start the backend on port `8000`.
2. Open Chrome and visit `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the `extension` folder.
5. Open a job posting page, click the CareerNest extension button, review or edit the detected fields, then click **Save Application**.
6. Refresh the dashboard and confirm the saved job appears.

The extension reads visible job page text through a content script and sends data to the local API through its Manifest V3 service worker. It does not submit applications, collect passwords, read cookies, or save anything until the user clicks the save button.

## Manual save test

1. Open any page with a job role heading, company text, and location text, or use a real LinkedIn, Greenhouse, Lever, Workday, or Indeed posting.
2. Open the extension popup.
3. Fill any missing role, company, location, URL, or notes fields manually.
4. Click **Save Application**.
5. Open the dashboard and filter by company or status `Saved`.

## API example

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/applications `
  -ContentType "application/json" `
  -Body '{"company":"Northstar Labs","role_title":"Software Engineer Intern","location":"Remote","job_url":"https://jobs.example.com/software-engineer-intern","source_site":"jobs.example.com","status":"Saved","date_applied":"2026-05-22","notes":"Saved from a job page."}'
```

