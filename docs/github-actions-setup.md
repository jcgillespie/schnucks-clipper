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
- `ACTION_GROUP_EMAIL`

Optional secrets (weekly summary email):

- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `WEEKLY_SUMMARY_EMAIL_FROM`
- `WEEKLY_SUMMARY_EMAIL_TO`

## 6. Trigger the deployment

Push to `main` (or use workflow dispatch). The CD workflow will:

- Build and push `ghcr.io/<owner>/<repo>:main`
- Run `tofu apply` with your secrets

## 7. Upload the session file

The job needs `data/session.json` in the Azure File Share.

```bash
npm install
npx playwright install chromium
npm run session:init
```

Then retrieve outputs and upload:

```bash
cd infra
tofu init \
  -backend-config="resource_group_name=$TFSTATE_RG" \
  -backend-config="storage_account_name=$TFSTATE_STORAGE" \
  -backend-config="container_name=$TFSTATE_CONTAINER" \
  -backend-config="key=$TFSTATE_KEY"

az storage file upload \
  --account-name $(tofu output -raw storage_account_name) \
  --share-name $(tofu output -raw file_share_name) \
  --source ../data/session.json \
  --path session.json \
  --account-key $(tofu output -raw storage_account_key)
```

## 8. Confirm alerts

Watch for the "Microsoft Azure Alerts" confirmation email and click the link to start receiving alerts.
