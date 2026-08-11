# Judkins Park P-Patch

Web app for Judkins Park P-Patch garden members: plots, shared tasks, inventory, weather, announcements, and garden-admin tools.

## Stack

| Layer | Tech |
|---|---|
| Backend | Django 5, Django REST Framework, SimpleJWT |
| Frontend | React, Vite, TypeScript |
| Database | SQLite locally; Postgres via `DATABASE_URL` in production |
| Email | Console (local) or Amazon SES (`EMAIL_PROVIDER`) |
| Deploy | Netlify (frontend) · Render (backend) |

## Repo layout

```text
backend/     Django API (manage.py, apps, requirements.txt)
frontend/    React + Vite UI
docs/        Team notes (auth flow, authz checklist, feature plans)
```

Work happens on **`main`** only.

## Prerequisites

- Python 3.12+ (3.13 works)
- Node.js 20+ and npm
- Backend and frontend running together for full local use

## Local setup

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # set SECRET_KEY; leave EMAIL_PROVIDER=console for local
python manage.py migrate
python manage.py runserver
```

API defaults to [http://127.0.0.1:8000](http://127.0.0.1:8000).

Without `DATABASE_URL`, Django uses local SQLite (`db.sqlite3`).

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

UI defaults to [http://127.0.0.1:5173](http://127.0.0.1:5173).

### 3. First admin user

```bash
cd backend
source venv/bin/activate
python manage.py createsuperuser
```

Use an **email** as the username (login is email-based). A new superuser is approved and marked garden admin so both Django admin (`/admin/`) and the in-app Admin screen work.

For the registration / approval flow, see [docs/dev-auth.md](docs/dev-auth.md).

## Auth roles

| Role | Flags | Access |
|---|---|---|
| Pending | `is_approved=False` | Dashboard only |
| Member | `is_approved=True` | Dashboard, Plots, Tasks, Inventory |
| Garden admin | `is_garden_admin=True` | Member screens + Admin |

`is_staff` / `is_superuser` are Django-only (who can open `/admin/`). They are not app roles.

## Tests

```bash
# Backend (from backend/, venv active)
python manage.py test --settings=config.settings_test

# Frontend (from frontend/)
npm test
```

## Environment

Copy the example files; do not commit real `.env` files.

**Backend** — see [backend/.env.example](backend/.env.example):

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret |
| `DEBUG` | `True` locally |
| `DATABASE_URL` | Optional; omit for SQLite |
| `EMAIL_PROVIDER` | `console` (local) or `ses` |
| `DEFAULT_FROM_EMAIL` | From address for notifications |
| `FRONTEND_URL` | Links in confirmation emails |
| `ALLOWED_HOSTS` | Host allowlist (production) |
| `CORS_ALLOWED_ORIGINS` | Frontend origin(s), no trailing slash |

**Frontend** — see [frontend/.env.example](frontend/.env.example):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Django API base URL (no trailing slash) |

Optional production frontend vars (see [frontend/README.md](frontend/README.md)): `VITE_DEFAULT_GARDEN_ID`.

## Deployment

- **Frontend (Netlify):** root [netlify.toml](netlify.toml) builds `frontend/` → `dist`. Set `VITE_API_URL` to the Render API URL. Details: [frontend/README.md](frontend/README.md).
- **Backend (Render):** [backend/build.sh](backend/build.sh) installs deps, collects static, and migrates. Set `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` to include your Netlify (or custom) origin.

## API surface

Base URL locally: `http://127.0.0.1:8000`. Most routes require a JWT (`Authorization: Bearer <access>`).

### Auth — `/api/auth/`

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register/` | Create account (pending until approved) |
| POST | `/api/auth/login/` | Email + password → JWT pair |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Current user (including pending) |
| POST | `/api/auth/confirm-email/` | Confirm registration email |
| POST | `/api/auth/resend-confirmation/` | Resend confirmation |
| POST | `/api/auth/change-password/` | Authenticated password change |
| POST | `/api/auth/change-email/` | Start email change |
| POST | `/api/auth/confirm-email-change/` | Confirm email change |
| GET | `/api/auth/pending/` | Garden admin: pending registrations |
| POST | `/api/auth/pending/<id>/approve/` | Garden admin |
| POST | `/api/auth/pending/<id>/reject/` | Garden admin |
| GET | `/api/auth/users/` | Garden admin: user list |

### Plots — `/api/`

| Method | Path | Notes |
|---|---|---|
| GET, POST | `/api/plots/` | List / create plots |
| GET, PATCH, DELETE | `/api/plots/<id>/` | Plot detail |
| POST | `/api/plots/<id>/assign/` | Garden admin: assign primary owner |
| GET, POST | `/api/plot-notes/` | Plot notes |
| GET, PATCH, DELETE | `/api/plot-notes/<id>/` | Note detail |
| GET, POST | `/api/plot-photos/` | Plot photos |
| GET, PATCH, DELETE | `/api/plot-photos/<id>/` | Photo detail |

### Help requests (tasks) — `/api/help-requests/`

| Method | Path | Notes |
|---|---|---|
| GET, POST | `/api/help-requests/` | List / create |
| GET, PATCH, DELETE | `/api/help-requests/<id>/` | Detail |
| POST | `/api/help-requests/<id>/claim/` | Claim task |
| POST | `/api/help-requests/<id>/unclaim/` | Unclaim |
| POST | `/api/help-requests/<id>/complete/` | Mark done |
| POST | `/api/help-requests/<id>/resend-claim/` | Garden admin: resend claim email |
| GET | `/api/help-requests/assignees/` | Assignee options |

### Inventory — `/api/inventory/`

| Method | Path |
|---|---|
| GET, POST | `/api/inventory/` |
| GET, PATCH, DELETE | `/api/inventory/<id>/` |

### Weather — `/api/weather/`

| Method | Path | Notes |
|---|---|---|
| GET | `/api/weather/` | Forecast (authenticated; pending users allowed) |

### Announcements — `/api/announcements/`

| Method | Path | Notes |
|---|---|---|
| GET, POST | `/api/announcements/` | GET any authenticated user; POST garden-admin only |

### Notifications — `/api/notifications/`

| Method | Path | Notes |
|---|---|---|
| POST | `/api/notifications/weekly-summary/` | Weekly summary webhook |

### Django admin

| Path | Notes |
|---|---|
| `/admin/` | Staff/superuser only |

Server permission expectations: [docs/server-authz-checklist.md](docs/server-authz-checklist.md).

## Docs

| Doc | Topic |
|---|---|
| [docs/dev-auth.md](docs/dev-auth.md) | Registration and approval walkthrough |
| [docs/server-authz-checklist.md](docs/server-authz-checklist.md) | API authorization expectations |
| [docs/admin-panel-phases.md](docs/admin-panel-phases.md) | Admin UI wiring plan |
| [frontend/README.md](frontend/README.md) | Frontend + Netlify details |

## License

MIT — see [LICENSE](LICENSE). Third-party attribution (weather-i18n): [NOTICE.md](NOTICE.md).
