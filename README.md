# Schnucks Coupon Clipper ✂️

Automated tool to clip all available Schnucks coupons using Playwright and Node.js. Designed for a reliable, "set-and-forget" deployment on Azure.

> [!WARNING]
> **Disclaimer**: This is an unofficial tool and is not affiliated with or endorsed by Schnucks. Use responsibly and at your own risk.

## 🚀 Features

- **Automated Clipping**: Efficiently fetches and clips all unclipped coupons via direct API calls (`fetch`), removing the need for a full browser runtime.
- **Session Persistence**: Uses `session-init` script (Playwright) to generate sessions locally, then runs headless in the cloud.
- **Dockerized**: Highly optimized multi-stage build using `esbuild` bundling and Alpine Linux. Final image size is **< 80MB** (down from ~500MB).
- **Production Infrastructure**: Infrastructure as Code (OpenTofu/Terraform) including Azure Container App Jobs, Storage Mounts, and Remote State Management.
- **Professional CI/CD**: Optimized GitHub Actions workflows with Docker layer caching, Buildx support, and concurrent deployment protection.

## 📦 Project Structure

- `src/`: TypeScript source code for the clipper and API interaction.
- `infra/`: Infrastructure as Code (OpenTofu/Terraform) for Azure.
- `.github/workflows/`: CI, CD, and Infrastructure validation pipelines.
- `specs/`: Technical specifications and research documentation.

## ⚙️ Quickstart

### 1. Prerequisites

- Node.js 20+
- Docker
- Azure CLI (for infrastructure and backend setup)
- OpenTofu (or Terraform 1.5+)

### 2. Local Setup

```bash
git clone https://github.com/jcgillespie/schnucks-clipper.git
cd schnucks-clipper
npm install
npx playwright install chromium
```

### 3. Initial Session Setup (CRITICAL)

Since Schnucks uses Two-Factor Authentication (2FA), the initial session must be established interactively:

```bash
npm run session:init
```

Follow the prompts in the headful browser window to log in. Once complete, the session and required `schnucks-client-id` will be saved to `./data/session.json`.

### 4. Direct Execution

```bash
npm run dev
```

## ☁️ Deployment

The project is designed to run as an **Azure Container App Job** on a daily schedule.

### 🔔 Monitoring & Alerts

The infrastructure automatically sets up:

- **Log Analytics Workspace**: Centralized log collection with 30-day retention.
- **Alert Rules**:
  - **Fatal Errors**: Triggers if the clipper encounters an exception.
  - **Session Expiry**: Triggers if the clipper logs `MISSING_CLIENT_ID`, requiring a session refresh.
- **Action Group**: Sends email notifications to the configured admin address.

**Post-Deployment Step**: You will receive an email from "Microsoft Azure Alerts" to confirm your subscription to the Action Group. You **must click the confirmation link** to start receiving alerts.

### 1. Azure Resource Provider Registration

Ensure the required Azure providers are registered in your subscription:

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

### 2. Remote State Backend

Create an Azure Storage account to host the OpenTofu state file and update the `backend` block in `infra/versions.tf`.

### 3. Infrastructure Provisioning

```bash
cd infra
export ARM_SUBSCRIPTION_ID="your-subscription-id"
tofu init
tofu apply -var="image_name=ghcr.io/your-username/schnucks-clipper:latest"
```

### 4. Upload Session Data

After infrastructure is provisioned and you have generated a local session (Step 3 in Quickstart), upload the `session.json` to the Azure File Share so the container can access it:

```bash
az storage file upload \
  --account-name schnucksclipperprodst \
  --share-name clipper-data \
  --source data/session.json \
  --path session.json
```


## 🛠️ Development

- `npm test`: Run unit and integration tests.
- `npm run lint`: Enforce code quality using ESLint 9.
- `npm run build`: Compile TypeScript to ESM.
- `npm run bundle`: Bundle the application into a single file using `esbuild`.
- `docker build -t schnucks-clipper .`: Build local Docker image (uses bundling).

## 📄 License

MIT
