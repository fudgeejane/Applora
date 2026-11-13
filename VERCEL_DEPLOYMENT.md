# Vercel deployment

Applora uses Vite at the repository root and an ES-module Express API in
`server/`. Deploy these as two Vercel projects from the same GitHub repository:

| Project | Vercel Root Directory | Build command | Output |
| --- | --- | --- | --- |
| Frontend | `.` (repository root) | `npm run build` | `dist` |
| Backend | `server` | Leave empty (Vercel builds the `api/` function) | Default |

The root `vercel.json` builds the Vite app and sends client-side routes to its
SPA entry point. `server/vercel.json` routes `/api/*` through the serverless
entry in `server/api/index.js`, which dispatches requests to the existing
Express app. `server/src/server.js` exports the app and only starts a listener
for local development.

## 1. Prepare GitHub

1. Commit and push the project to GitHub.
2. Confirm `.env`, `.env.*`, and local build/dependency folders are ignored.
   The `.env.example` files contain placeholders only; never commit real
   credentials.
3. Keep the frontend and backend projects connected to the same repository.

## 2. Configure MongoDB Atlas

1. Create an Atlas cluster and database user with a strong password.
2. Add the Vercel backend's outbound access as permitted by the Atlas network
   access policy. For initial setup, Atlas allows `0.0.0.0/0`; use that only
   with strong database credentials and least-privilege database access.
3. Copy the Atlas connection string and replace its username, password, and
   database placeholders. Add it to the backend project's `MONGODB_URI`.

The backend reads `MONGODB_URI` (not `MONGO_URI`). Its serverless handler
reuses the Mongoose connection across warm invocations and the health endpoint
does not connect to MongoDB.

## 3. Deploy the backend

1. In Vercel, import the repository as a new project named for the API.
2. Set **Root Directory** to `server`.
3. Leave the build command and output directory at their defaults; the project
   uses `server/api/index.js` as its serverless function.
   Set the Node.js version to 22 or newer to satisfy `server/package.json`.
4. Add the backend environment variables listed below for Production, Preview,
   and Development as applicable.
5. Deploy and note the backend deployment origin, for example
   `https://your-api.vercel.app`.
6. Check `https://your-api.vercel.app/api/health`; it should return
   `{"success":true,"status":"ok"}` without requiring a database connection.

## 4. Deploy the frontend

1. Import the same repository again as a separate Vercel project.
2. Set **Root Directory** to `.` (the repository root). Do not set it to a
   `frontend` directory; none exists in this project.
3. Set the build command to `npm run build` and output directory to `dist`.
   Vercel can also read these from the root `vercel.json`.
   Use Node.js 22 or newer for the Vite build.
4. Set `VITE_API_URL` to the backend origin followed by `/api`, e.g.
   `https://your-api.vercel.app/api`.
5. Set the backend's `CLIENT_URL` to the exact frontend origin, e.g.
   `https://your-app.vercel.app`, then redeploy the backend.
6. Redeploy the frontend after setting `VITE_API_URL`, because Vite embeds
   `VITE_` variables at build time.

## 5. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Secrets
belong only in the backend project, never in variables prefixed with `VITE_`.

| Variable | Project | Required | Notes |
| --- | --- | --- | --- |
| `MONGODB_URI` | Backend | Yes | MongoDB Atlas connection string; the code uses this exact name. |
| `JWT_SECRET` | Backend | Yes | Unique secret of at least 32 bytes. |
| `OTP_SECRET` | Backend | Yes | Different secret from `JWT_SECRET`, at least 32 bytes. |
| `CLIENT_URL` | Backend | Yes | Exact frontend origin, with scheme and no path or trailing slash. |
| `NODE_ENV` | Backend | Automatic | Vercel sets `production` for production deployments; do not override it. |
| `TRUST_PROXY` | Backend | Recommended | Set to `1` when using a proxy; Vercel is trusted automatically. |
| `VITE_API_URL` | Frontend | Yes for deployment | Backend origin plus `/api`; this value is public, not a secret. |
| `EMAIL_USER`, `EMAIL_PASS` | Backend | Feature-dependent | Gmail credentials for verification, password reset, and support mail. |
| `GEMINI_API_KEY` | Backend | Feature-dependent | Required for AI assistance. |
| `GEMINI_MODEL` | Backend | Optional | Overrides the default Gemini model. |
| `GEMINI_PAID_SERVICE` | Backend | Resume analysis | Must be `true` when the paid resume-analysis service is configured. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Backend | Feature-dependent | Required for profile picture and resume file storage. |
| `NOMINATIM_EMAIL` | Backend | Optional | Contact email for location search requests. |

Use the exact frontend origin for each backend deployment environment. If
preview deployments use changing origins, configure a stable preview domain or
set the matching `CLIENT_URL` for the preview deployment. The API intentionally
does not allow arbitrary origins.

Production auth cookies use `HttpOnly`, `Secure`, and `SameSite=None` so they
can be sent between the separately hosted frontend and backend. CORS allows
credentials only from `CLIENT_URL`; state-changing requests also pass the
existing exact-origin/Fetch Metadata CSRF checks. Local development keeps
`SameSite=Lax` and uses Vite's `/api` proxy.

## 6. Local environment

Copy `server/.env.example` to `server/.env` and set local backend values. The
root `.env.example` documents the optional frontend `VITE_API_URL`; leave it
unset locally to use `/api` through the Vite proxy. Do not put backend secrets
in a root/frontend `.env` file.

## 7. Troubleshooting

- **CORS or credential errors:** Confirm backend `CLIENT_URL` exactly matches
  the browser's frontend origin and includes no path or trailing slash. Ensure
  frontend `VITE_API_URL` is the backend URL ending in `/api`, then rebuild
  the frontend.
- **Login works but later requests are unauthenticated:** Confirm production
  uses HTTPS, credentials are enabled, and both Vercel environment variables
  above match the deployed origins. Browser cookie policies may block cookies
  between unrelated sites; use frontend and API domains under the same
  registrable domain when possible.
- **API returns a configuration error:** Check the backend's function logs and
  confirm `MONGODB_URI`, independent 32-byte `JWT_SECRET` and `OTP_SECRET`,
  and `CLIENT_URL` are set in the selected Vercel environment.
- **Database connection fails:** Verify the Atlas URI, database user/password
  URL encoding, cluster status, and Atlas network access list.
- **Deep links return 404:** Confirm the frontend project uses the repository
  root, `dist` output, and the SPA rewrite in root `vercel.json`.
- **Uploads fail despite passing application validation:** Vercel Functions
  impose a request payload limit (currently 4.5 MB), while the application
  accepts profile pictures up to 5 MB and resumes up to 8 MB. Large multipart
  uploads may therefore fail before Express handles them; use smaller files or
  move uploads to a direct-to-Cloudinary flow if this limit affects production.
- **Email, AI, or file features are unavailable:** Add the corresponding
  backend-only provider variables above and redeploy the backend.

## 8. Validation scope

The repository includes a Vercel function dispatch test and a health check test.
Local production builds and backend tests can verify project packaging and
request routing, but they do not prove a live Vercel deployment, Atlas
connectivity, or third-party provider credentials.
