# Schnucks Coupon Clipper ✂️

Automated tool to clip all available Schnucks coupons using Playwright and Node.js. Designed for a "set and forget" deployment on Azure.

## Features

- **Automated Clipping**: Automatically fetches and clips all unclipped coupons.
- **Session Persistence**: Saves and loads Playwright browser context to maintain authentication state.
- **Dockerized**: Minimal container footprint (Playwright + Node.js).
- **Cloud Ready**: Infrastructure as Code (OpenTofu/Terraform) for Azure Container App Jobs.
- **CI/CD**: Fully automated test and deployment pipelines via GitHub Actions.

## Quickstart

### 1. Prerequisites

- Node.js 20+
- Docker
- Azure CLI (if deploying manually)
- OpenTofu (or Terraform 1.5+)

### 2. Local Setup

```bash
git clone https://github.com/jcgillespie/schnucks-clipper.git
cd schnucks-coupons
npm install
npx playwright install chromium
cp .env.example .env
```

### 3. Initial Session Setup (CRITICAL)

Since Schnucks uses TFA, the first run must be interactive to establish a session:

```bash
npm run session:init
```

Follow the prompts in the browser window to log in. The session will be saved to `./data/session.json`.

### 4. Run Locally

```bash
npm run dev
```

## Deployment & CI/CD

The project is designed to run as an **Azure Container App Job** on a schedule (e.g., daily).

### Infrastructure

Provision resources using OpenTofu:

```bash
cd infra
tofu init
tofu apply
```

### GitHub Actions Secrets

The following secrets are required for the CI/CD workflows:

| Secret                  | Description                 |
| ----------------------- | --------------------------- |
| `AZURE_CLIENT_ID`       | Service Principal Client ID |
| `AZURE_CLIENT_SECRET`   | Service Principal Secret    |
| `AZURE_TENANT_ID`       | Azure Tenant ID             |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID       |

## Development

- `npm test`: Run unit and integration tests.
- `npm run lint`: Check code style.
- `npm run build`: Compile TypeScript to JavaScript.
- `docker build -t schnucks-clipper .`: Build local Docker image.

## License

MIT
