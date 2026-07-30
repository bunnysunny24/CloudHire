# CloudHire

CloudHire is a cloud-native interview management platform built with React, Node.js, Express.js, PostgreSQL, Redis, Docker, and AWS-ready deployment patterns.

It includes role-based authentication for candidates, recruiters, and administrators, REST APIs for assessment management, applications, resume uploads, coding tests, and recruiter analytics.

## Features

- JWT authentication with candidate, recruiter, and admin roles.
- PostgreSQL schema bootstrap with seeded demo accounts and assessments.
- Redis-backed assessment list caching.
- Recruiter/admin assessment creation with attached coding prompts.
- Candidate application submission with resume upload support.
- Recruiter analytics for application totals, funnel counts, average score, and top assessments.
- React dashboard with demo login shortcuts and API-backed data when services are running.
- Docker Compose stack for frontend, backend, PostgreSQL, and Redis.
- GitHub Actions workflow for linting, frontend build, and backend tests.

## Demo Accounts

All seeded accounts use the password `password123`.

| Role | Email |
| --- | --- |
| Candidate | `candidate@cloudhire.dev` |
| Recruiter | `recruiter@cloudhire.dev` |
| Admin | `admin@cloudhire.dev` |

## Run With Docker

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:8088`.

The API health endpoint is available at `http://localhost:4000/health`.

## Run Locally

Start PostgreSQL and Redis locally, then:

```bash
npm install --workspaces
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:4000`

## API Overview

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a user account |
| `POST` | `/api/auth/login` | Public | Sign in and receive a JWT |
| `GET` | `/api/assessments` | Authenticated | List assessments |
| `POST` | `/api/assessments` | Recruiter, Admin | Create assessment and coding test |
| `POST` | `/api/applications/:assessmentId` | Candidate | Submit an application and optional resume |
| `GET` | `/api/applications` | Recruiter, Admin | Review all applications |
| `PATCH` | `/api/applications/:id` | Recruiter, Admin | Update status and score |
| `GET` | `/api/analytics/recruiter` | Recruiter, Admin | Recruiter dashboard metrics |

## AWS Deployment Shape

- Backend runs on EC2 or ECS with `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `CLIENT_URL` configured as environment variables.
- PostgreSQL can be moved to Amazon RDS without code changes.
- Resume uploads currently write to a Docker volume; the upload route is isolated so S3 storage can replace local disk cleanly.
- The frontend Docker image can run behind an Application Load Balancer or be built and hosted from S3 plus CloudFront.

## Resume Mapping

- Built role-based authentication for candidates, recruiters, and administrators using JWT and REST APIs.
- Containerized frontend, backend, PostgreSQL, and Redis services with Docker Compose.
- Designed REST APIs for assessment management, resume uploads, coding tests, and recruiter analytics.
- Added CI/CD automation through GitHub Actions.
