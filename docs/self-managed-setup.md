# Self-Managed Deployment (Local)

This guide assumes you deploy from your machine. The clipper runs as an Azure Container App Job on a daily schedule.

## Prerequisites

- Docker
- Azure CLI
- OpenTofu (or Terraform 1.5+)

Complete the Quickstart in `README.md` to generate `data/session.json` before deploying.

## 1. Build and push the container image

```bash
export IMAGE_NAME="ghcr.io/<your-username>/schnucks-clipper:latest"
echo "<ghcr-pat>" | docker login ghcr.io -u "<your-username>" --password-stdin
docker build -t "$IMAGE_NAME" .
docker push "$IMAGE_NAME"
```

Use a GitHub PAT with `write:packages` for local pushes. Azure pulls the image using `registry_password`, which only needs `read:packages`.

## 2. Register Azure resource providers

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## 3. Create the remote state backend

```bash
export TFSTATE_RG="schnucks-clipper-state-rg"
export TFSTATE_STORAGE="schnucksstate<unique>"
export TFSTATE_CONTAINER="tfstate"

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

Create `infra/backend.hcl` from the example and fill in your values:

```bash
cp infra/backend.hcl.example infra/backend.hcl
```

## 4. Authenticate to Azure

```bash
az login
az account set --subscription "<your-subscription-id>"
export ARM_SUBSCRIPTION_ID="<your-subscription-id>"
```

If you prefer a service principal, export `ARM_SUBSCRIPTION_ID`, `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, and `ARM_TENANT_ID` instead of using `az login`.

If you enable weekly summaries with a service principal, grant it the "User Access Administrator" role so it can create role assignments:

```bash
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role "User Access Administrator" \
  --scope /subscriptions/<subscription-id>
```

## 5. Provision infrastructure

**Required variables:**

- `image_name`: Full Docker image name and tag (e.g., `ghcr.io/your-username/schnucks-clipper:latest`)
- `registry_username`: Registry username (for GHCR, your GitHub username)
- `registry_password`: Registry password/token (for GHCR, a PAT with `read:packages`)

**Optional variables (daily health digest email - recommended for monitoring):**

- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`
- `weekly_summary_email_from`, `weekly_summary_email_to`

```bash
cd infra
tofu init -backend-config=backend.hcl
tofu apply \
  -var="image_name=$IMAGE_NAME" \
  -var="registry_username=<your-username>" \
  -var="registry_password=<registry-password>"
```

If you use a registry other than GHCR, set `registry_server` accordingly (default: `ghcr.io`).

> [!NOTE]
> The weekly summary job is optional. If you omit SMTP variables, it will not be created.

## 6. Upload session data

After provisioning, upload the local `data/session.json` so the container can access it.

```bash
az storage file upload \
  --account-name $(cd infra && tofu output -raw storage_account_name) \
  --share-name $(cd infra && tofu output -raw file_share_name) \
  --source data/session.json \
  --path session.json \
  --account-key $(cd infra && tofu output -raw storage_account_key)
```

## 7. Monitoring & Alerts

The infrastructure automatically sets up:

- **Log Analytics Workspace**: Centralized log collection with 30-day retention.
- **Alert Rules**:
  - **App Health**: A consolidated alert that triggers if the clipper encounters an exception, fatal error, or requires a session refresh (`MISSING_CLIENT_ID`).
  - **Job Failure**: Triggers only when the container job fails at the system level after exhausting its retry limit.
- **Action Group**: Sends email notifications to the configured admin address.
- **Weekly Job Summary**: A separate container job that runs every Sunday to send a weekly email summary of all job executions in the past 7 days with their final status and coupon counts.

**Post-deployment step**: You will receive an email from "Microsoft Azure Alerts" to confirm your subscription to the Action Group. You must click the confirmation link to start receiving alerts.
