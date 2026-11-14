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

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for separate frontend and backend Vercel project setup. The Vite frontend is at the repository root and the Express backend is in `server/`.
The backend requires Node.js 22.13+ or 24+; its Vercel function bundles the PDF.js worker, fonts, and native canvas packages used for resume PDF extraction.

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
