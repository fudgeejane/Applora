# Applora

**A centralized job application management platform.**

Applora is a web-based application designed to help job seekers organize, track, and manage their job search journey in one place. It provides a centralized workspace for managing job applications, resumes, interview schedules, and career-related activities.

The project focuses on simplifying the job search process through organized application tracking, resume management, and AI-powered career assistance.


## Technology Stack

### Frontend
- React.js
- JavaScript
- Tailwind CSS
- Vite
- GSAP
- Lucide React

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)

### Authentication & Email
- JWT Authentication
- Nodemailer
- React Email
- One-Time Password (OTP) Email Verification

### Development Tools
- Visual Studio Code
- Git & GitHub
- Postman
- Vercel

## Deployment

The root Vite frontend and `api/[...path].js` function are deployed in the same Vercel project. The function forwards `/api/*` requests to the existing Express application, so the frontend uses the same-origin `/api` base URL in production. Local development uses the `/api` proxy in `vite.config.js`.

Configure these values in the Vercel project's Environment Variables; do not expose secrets through `VITE_` variables:

- `CLIENT_URL` — the exact deployed frontend origin, such as `https://applora-ruby.vercel.app`
- `MONGODB_URI`
- `JWT_SECRET` and `OTP_SECRET` — independent secrets, each at least 32 bytes
- `TRUST_PROXY=1` — required for the Express HTTPS check behind Vercel's proxy

Vercel provides `NODE_ENV=production` for production deployments. Configure email, AI, and Cloudinary credentials there as well if those features are enabled. Local backend configuration belongs in `server/.env`; never commit environment files.

## Authentication Workflow

Applora implements an email-based authentication process.

1. **Registration** – Users create an account using their email address and password.
2. **Email Verification** – A one-time verification code is sent to the registered email address.
3. **OTP Validation** – Users must enter the verification code before proceeding. Codes expire after a defined period.
4. **Profile Completion** – Newly verified users are redirected to complete their profile when required.
5. **Login** – Verified users can authenticate and access protected application routes.
6. **Session Management** – JWT-based authentication is used to manage authenticated requests and access to protected resources.


## Development Status

**Currently under development.**

Applora is an ongoing personal development project. Features and functionality are continuously being improved as development progresses.
