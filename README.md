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

- Node.js 24+
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

**Optional: Environment Configuration**

Copy `.env.example` to `.env` and customize if needed:

- `SCHNUCKS_BASE_URL`: Schnucks website URL (default: `https://schnucks.com`)
- `DATA_PATH`: Path for session data storage (default: `./data`)
- `SESSION_FILE`: Path to session file (default: `{DATA_PATH}/session.json`)
- `LOG_LEVEL`: Logging level (default: `info`)

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
  - **App Health**: A consolidated alert that triggers if the clipper encounters an exception, fatal error, or requires a session refresh (`MISSING_CLIENT_ID`).
  - **Job Failure**: Triggers only when the container job fails at the system level after exhausting its retry limit.
- **Action Group**: Sends email notifications to the configured admin address.
- **Weekly Job Summary**: A separate container job that runs every Sunday to send a weekly email summary of all job executions in the past 7 days with their final status and coupon counts.

**Post-Deployment Step**: You will receive an email from "Microsoft Azure Alerts" to confirm your subscription to the Action Group. You **must click the confirmation link** to start receiving alerts.

### 1. Azure Resource Provider Registration

Ensure the required Azure providers are registered in your subscription:

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

### 2. Remote State Backend

Create an Azure Storage account to host the OpenTofu state file, then create a local `infra/backend.hcl` based on `infra/backend.hcl.example`. Initialize with:

```bash
cd infra
tofu init -backend-config=backend.hcl
```

### 3. Azure Authentication Setup

For infrastructure provisioning, you need Azure credentials. You can either:

**Option A: Use Azure CLI (for local deployment)**

```bash
az login
az account set --subscription "your-subscription-id"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
```

**Option B: Create a Service Principal (for CI/CD)**

```bash
az ad sp create-for-rbac --name "schnucks-clipper-sp" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}
```

Save the output values:

- `appId` → `AZURE_CLIENT_ID`
- `password` → `AZURE_CLIENT_SECRET`
- `tenant` → `AZURE_TENANT_ID`
- `subscription-id` → `AZURE_SUBSCRIPTION_ID`

**Grant Additional Permissions (Required for Weekly Summary Feature):**

The service principal needs "User Access Administrator" role to create role assignments for the weekly summary job's managed identity. Grant this role at the subscription or resource group level:

```bash
# At subscription level (recommended for automation)
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role "User Access Administrator" \
  --scope /subscriptions/{subscription-id}

# OR at resource group level (more restrictive)
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role "User Access Administrator" \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group-name}
```

> [!IMPORTANT]
> Without the "User Access Administrator" role, the weekly summary job will be created but the role assignment for Log Analytics access will fail. You'll need to manually assign the "Log Analytics Reader" role to the job's managed identity if you skip this step.

### 4. Infrastructure Provisioning

**Required Variables:**

- `image_name`: Full Docker image name and tag (e.g., `ghcr.io/your-username/schnucks-clipper:latest`)
- `registry_username`: Container registry username (e.g., your GitHub username for GHCR)
- `registry_password`: Container registry password/token (e.g., GitHub Personal Access Token with `read:packages` scope)
- `action_group_email`: Email address for alert notifications

**Optional Variables (for Weekly Summary Email):**

- `smtp_host`: SMTP server hostname (e.g., `smtp.mailgun.org` for Mailgun)
- `smtp_port`: SMTP server port (default: `587` for TLS)
- `smtp_user`: SMTP username (e.g., your Mailgun email address)
- `smtp_password`: SMTP password (e.g., your Mailgun API key)
- `weekly_summary_email_from`: Email address to send weekly summary from (defaults to `smtp_user` if not set)
- `weekly_summary_email_to`: Email address to send weekly summary to (defaults to `action_group_email` if not set)

**Deploy Infrastructure:**

```bash
cd infra
export ARM_SUBSCRIPTION_ID="your-subscription-id"
tofu init -backend-config=backend.hcl
tofu apply \
  -var="image_name=ghcr.io/your-username/schnucks-clipper:latest" \
  -var="registry_username=your-github-username" \
  -var="registry_password=your-ghcr-token" \
  -var="action_group_email=your-email@example.com" \
  -var="smtp_host=smtp.mailgun.org" \
  -var="smtp_port=587" \
  -var="smtp_user=your-mailgun-email@yourdomain.com" \
  -var="smtp_password=your-mailgun-api-key" \
  -var="weekly_summary_email_from=your-mailgun-email@yourdomain.com"
```

> [!NOTE]
> The weekly summary job is **optional**. If you don't provide SMTP configuration variables, the weekly summary job will not be created. The code is fully abstracted and works with any SMTP provider (Mailgun, SMTP2Go, Gmail, SendGrid, etc.) - just change the `smtp_host` and credentials.

### 5. Upload Session Data

After infrastructure is provisioned and you have generated a local session (Step 3 in Quickstart), upload the `session.json` to the Azure File Share so the container can access it.

**Retrieve Output Values:**

```bash
cd infra
tofu output storage_account_name
tofu output file_share_name
tofu output -raw storage_account_key  # -raw removes quotes from sensitive output
```

**Upload Session File:**

```bash
az storage file upload \
  --account-name $(cd infra && tofu output -raw storage_account_name) \
  --share-name $(cd infra && tofu output -raw file_share_name) \
  --source data/session.json \
  --path session.json \
  --account-key $(cd infra && tofu output -raw storage_account_key)
```

Or set them as variables for easier reuse:

```bash
STORAGE_ACCOUNT=$(cd infra && tofu output -raw storage_account_name)
FILE_SHARE=$(cd infra && tofu output -raw file_share_name)
STORAGE_KEY=$(cd infra && tofu output -raw storage_account_key)

az storage file upload \
  --account-name "$STORAGE_ACCOUNT" \
  --share-name "$FILE_SHARE" \
  --source data/session.json \
  --path session.json \
  --account-key "$STORAGE_KEY"
```

## 🔧 CI/CD Setup (Optional)

If you want to use GitHub Actions for automated builds and deployments, configure the following secrets in your repository:

**Required GitHub Secrets:**

- `AZURE_CLIENT_ID`: Service principal application ID
- `AZURE_CLIENT_SECRET`: Service principal password
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID
- `AZURE_TENANT_ID`: Azure tenant ID
- `TFSTATE_RESOURCE_GROUP`: Resource group name for Terraform state storage
- `TFSTATE_STORAGE_ACCOUNT`: Storage account name for Terraform state
- `TFSTATE_CONTAINER`: Container name for Terraform state (e.g., `tfstate`)
- `TFSTATE_KEY`: State file key (e.g., `terraform.tfstate`)
- `GHCR_PAT`: GitHub Personal Access Token with `write:packages` scope (for pushing images)
- `ACTION_GROUP_EMAIL`: Email address for alert notifications

**Optional GitHub Secrets (for Weekly Summary Feature):**

- `SMTP_HOST`: SMTP server hostname (e.g., `smtp.mailgun.org`)
- `SMTP_USER`: SMTP username (e.g., your Mailgun email address)
- `SMTP_PASSWORD`: SMTP password/API key (sensitive)
- `WEEKLY_SUMMARY_EMAIL_FROM`: Email address to send weekly summary from
- `WEEKLY_SUMMARY_EMAIL_TO`: Email address to send weekly summary to (defaults to `ACTION_GROUP_EMAIL` if not set)

> [!IMPORTANT]
> **Service Principal Permissions**: The service principal (`AZURE_CLIENT_ID`) must have the "User Access Administrator" role at the subscription or resource group level to enable the weekly summary feature. This is required for Terraform to create role assignments for the weekly summary job's managed identity. See the [Service Principal Setup](#3-azure-authentication-setup) section for instructions on granting this role.

The workflows will automatically:

1. Build and push Docker images to GitHub Container Registry on pushes to `main`
2. Deploy infrastructure using OpenTofu
3. Run Terraform validation on pull requests

## 🛠️ Development

- `npm test`: Run unit and integration tests.
- `npm run lint`: Enforce code quality using ESLint 9.
- `npm run build`: Compile TypeScript to ESM.
- `npm run bundle`: Bundle the application into a single file using `esbuild` (includes both clipper and weekly summary).
- `npm run test:weekly-summary`: Test weekly summary functionality locally (see [Testing Guide](docs/testing-weekly-summary.md)).
- `docker build -t schnucks-clipper .`: Build local Docker image (uses bundling).

### Testing Weekly Summary Locally

You can test the weekly summary feature without deploying to Azure. See [docs/testing-weekly-summary.md](docs/testing-weekly-summary.md) for detailed instructions.

Quick test with mock data:

```bash
npm run test:weekly-summary -- --mock
```

## 📄 License

ISC
