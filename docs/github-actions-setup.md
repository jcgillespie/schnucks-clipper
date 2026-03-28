# GitHub Actions Deployment (Forked Repo)

This guide assumes you fork the repo and want GitHub Actions to build/push the image and deploy Azure infrastructure on pushes to `main`.

## 1. Fork and enable Actions

- Fork the repository.
- Ensure Actions are enabled in your fork (Settings -> Actions -> General).
- Keep the default branch as `main` (the CD workflow triggers on `main`).

## 2. Create the OpenTofu state backend

```bash
export TFSTATE_RG="schnucks-clipper-state-rg"
export TFSTATE_STORAGE="schnucksstate<unique>"
export TFSTATE_CONTAINER="tfstate"
export TFSTATE_KEY="terraform.tfstate"

az group create --name "$TFSTATE_RG" --location "Central US"
az storage account create \
  --name "$TFSTATE_STORAGE" \
  --resource-group "$TFSTATE_RG" \
  --location "Central US" \
  --sku Standard_LRS
az storage container create \
  --name "$TFSTATE_CONTAINER" \
  --account-name "$TFSTATE_STORAGE" \
  --auth-mode login
```

Save these values for GitHub Secrets in step 5.

## 3. Create a service principal for CI

```bash
az ad sp create-for-rbac --name "schnucks-clipper-gha" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>
```

Capture the output:

- `appId` -> `AZURE_CLIENT_ID`
- `password` -> `AZURE_CLIENT_SECRET`
- `tenant` -> `AZURE_TENANT_ID`
- `<subscription-id>` -> `AZURE_SUBSCRIPTION_ID`

If you plan to enable the weekly summary job, grant "User Access Administrator" so the workflow can create role assignments:

```bash
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role "User Access Administrator" \
  --scope /subscriptions/<subscription-id>
```

## 4. Create a GHCR PAT for pulls

Create a GitHub Personal Access Token with `read:packages` and store it as `GHCR_PAT`. This token is used by Azure to pull the image. The workflow uses `GITHUB_TOKEN` to push.

## 5. Add GitHub Secrets in your fork

Required secrets:

- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`
- `TFSTATE_RESOURCE_GROUP`
- `TFSTATE_STORAGE_ACCOUNT`
- `TFSTATE_CONTAINER`
- `TFSTATE_KEY`
- `GHCR_PAT`
- `SESSION_JSON_B64`: Base64-encoded contents of `data/session.json` (see step 7)

Optional secrets (daily health digest email - recommended for monitoring):

- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `WEEKLY_SUMMARY_EMAIL_FROM`
- `WEEKLY_SUMMARY_EMAIL_TO`

## 6. Trigger the deployment

Push to `main` (or use workflow dispatch). The CD workflow will:

- Build and push `ghcr.io/<owner>/<repo>:main`
- Run `tofu apply` with your secrets

## 7. Upload the session secret

The container receives your session via the `SESSION_JSON_B64` GitHub Secret. Run `session:init` locally first if you haven't already:

```bash
npm install
npx playwright install chromium
npm run session:init
```

Then encode `data/session.json` to Base64 and store it as the `SESSION_JSON_B64` secret in your fork (Settings -> Secrets and variables -> Actions):

```bash
# macOS
base64 -i data/session.json | tr -d '\n'

# Linux
base64 -w 0 data/session.json
```

Copy the output and save it as the `SESSION_JSON_B64` secret. The CD workflow passes it to `tofu apply` on every deploy.

> [!NOTE]
> If your session expires, re-run `npm run session:init`, re-encode the new `data/session.json`, update the `SESSION_JSON_B64` secret, and re-run the CD workflow.

## 8. Confirm alerts

Watch for the "Microsoft Azure Alerts" confirmation email and click the link to start receiving alerts.
