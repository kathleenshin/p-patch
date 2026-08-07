# P-Patch frontend
React + Vite UI for Judkins Park P-Patch (dashboard, plots, tasks, inventory, admin).

## Prerequisites
- Node.js 20+ (18+ may work)
- npm (comes with Node)
- Backend running locally if you need API calls (Django on port 8000)

## Setup from scratch
From the repo root:
```bash
cd frontend
npm install
```

To run locally:
```bash
npd run dev
```

## Netlify deployment
This repo is set up for Netlify to host the Vite frontend only. The Django backend should stay on Render or another Python host unless you rewrite it as serverless functions.

Set these in Netlify for the site:

- `VITE_API_URL=https://your-render-backend.onrender.com`
- `VITE_DEFAULT_GARDEN_ID=1` if you want to override the default garden used by inventory writes

The repository root includes `netlify.toml` with:

- base directory: `frontend`
- build command: `npm run build`
- publish directory: `dist`

After deploy, add your Netlify origin to the Django backend environment:

- `ALLOWED_HOSTS=your-render-backend.onrender.com`
- `CORS_ALLOWED_ORIGINS=https://your-netlify-site.netlify.app`

If you use a custom frontend domain, include that in `CORS_ALLOWED_ORIGINS` too.