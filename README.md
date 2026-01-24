# Schnucks Coupon Clipper ✂️

Automated tool to clip all available Schnucks coupons using Playwright and Node.js. Designed for a reliable, "set-and-forget" deployment on Azure.

> [!WARNING]
> **Disclaimer**: This is an unofficial tool and is not affiliated with or endorsed by Schnucks. Use responsibly and at your own risk.

## 🚀 Features

- **Automatic clipping**: Finds and clips all available coupons for you.
- **Set-and-forget schedule**: Runs on a daily schedule in the cloud once deployed.
- **Session-based login**: Supports Schnucks 2FA by creating a session once, then reusing it.
- **Reliability alerts**: Email notifications when something needs attention.
- **Weekly summary**: Optional weekly email with job results and counts.

## 📦 Project Structure

- `src/`: TypeScript source code for the clipper and API interaction.
- `infra/`: Infrastructure as Code (OpenTofu/Terraform) for Azure.
- `.github/workflows/`: CI, CD, and Infrastructure validation pipelines.
- `specs/`: Technical specifications and research documentation.

## ⚙️ Quickstart (Local)

### 1. Prerequisites

- Node.js 24+

Deployment prerequisites (Docker, Azure CLI, OpenTofu) are covered in the deployment guides below.

### 2. Clone and install

```bash
git clone https://github.com/jcgillespie/schnucks-clipper.git
cd schnucks-clipper
npm install
npx playwright install chromium
```

### 3. Configure environment (optional)

Copy `.env.example` to `.env` and customize if needed:

- `SCHNUCKS_BASE_URL`: Schnucks website URL (default: `https://schnucks.com`)
- `DATA_PATH`: Path for session data storage (default: `./data`)
- `SESSION_FILE`: Path to session file (default: `{DATA_PATH}/session.json`)
- `LOG_LEVEL`: Logging level (default: `info`)

### 4. Create the initial session (required before deploy)

Schnucks uses Two-Factor Authentication (2FA), so the initial session must be established interactively:

```bash
npm run session:init
```

Follow the prompts in the headful browser window to log in. Once complete, the session and required `schnucks-client-id` will be saved to `./data/session.json`.

### 5. Run locally

```bash
npm run dev
```

## ☁️ Deployment

Choose one of the deployment guides:

- **Self-managed (local apply)**: `docs/self-managed-setup.md`
- **GitHub Actions (forked repo)**: `docs/github-actions-setup.md`

## 🔧 CI/CD Setup (Optional)

For forked-repo deployments via GitHub Actions, see `docs/github-actions-setup.md`. If you are configuring CI/CD manually, configure the following secrets in your repository:

**Required GitHub Secrets:**

- `AZURE_CLIENT_ID`: Service principal application ID
- `AZURE_CLIENT_SECRET`: Service principal password
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID
- `AZURE_TENANT_ID`: Azure tenant ID
- `TFSTATE_RESOURCE_GROUP`: Resource group name for Terraform state storage
- `TFSTATE_STORAGE_ACCOUNT`: Storage account name for Terraform state
- `TFSTATE_CONTAINER`: Container name for Terraform state (e.g., `tfstate`)
- `TFSTATE_KEY`: State file key (e.g., `terraform.tfstate`)
- `GHCR_PAT`: GitHub Personal Access Token with at least `read:packages` scope (used by Azure for registry pulls). If you use this PAT to push images instead of the built-in `GITHUB_TOKEN`, also grant `write:packages`. See the deployment guides for details.
- `ACTION_GROUP_EMAIL`: Email address for alert notifications

**Optional GitHub Secrets (for Weekly Summary Feature):**

- `SMTP_HOST`: SMTP server hostname (e.g., `smtp.mailgun.org`)
- `SMTP_USER`: SMTP username (e.g., your Mailgun email address)
- `SMTP_PASSWORD`: SMTP password/API key (sensitive)
- `WEEKLY_SUMMARY_EMAIL_FROM`: Email address to send weekly summary from
- `WEEKLY_SUMMARY_EMAIL_TO`: Email address to send weekly summary to (defaults to `ACTION_GROUP_EMAIL` if not set)

> [!IMPORTANT]
> **Service Principal Permissions**: The service principal (`AZURE_CLIENT_ID`) must have the "User Access Administrator" role at the subscription or resource group level to enable the weekly summary feature. This is required for Terraform to create role assignments for the weekly summary job's managed identity. See `docs/self-managed-setup.md` and `docs/github-actions-setup.md` for the role assignment command.

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

## 🧾 Colophon

Built on a modern, production-ready stack: Node.js with an `esbuild` bundle, Playwright for session bootstrapping, and Azure Container Apps Jobs on a CRON schedule. Infrastructure is defined with OpenTofu/Terraform, with GitHub Actions providing CI/CD and automated container publishing.

## 📄 License

ISC
