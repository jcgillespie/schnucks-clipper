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
- `session_json_b64`: Base64-encoded contents of `data/session.json` (see step 6)

**Optional variables (daily health digest email - recommended for monitoring):**

- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`
- `weekly_summary_email_from`, `weekly_summary_email_to`

If you use a registry other than GHCR, set `registry_server` accordingly (default: `ghcr.io`).

> [!NOTE]
> The weekly summary job is optional. If you omit SMTP variables, it will not be created.

## 6. Encode and pass session data

The container receives your session via the `SESSION_JSON_B64` environment variable. Encode `data/session.json` to Base64 and pass it as a Tofu variable:

```bash
# macOS
export SESSION_JSON_B64=$(base64 -i data/session.json | tr -d '\n')

# Linux
export SESSION_JSON_B64=$(base64 -w 0 data/session.json)
```

Then provision:

```bash
cd infra
tofu init -backend-config=backend.hcl
tofu apply \
  -var="image_name=$IMAGE_NAME" \
  -var="registry_username=<your-username>" \
  -var="registry_password=<registry-password>" \
  -var="session_json_b64=$SESSION_JSON_B64"
```

> [!NOTE]
> If your session expires, re-run `npm run session:init`, re-encode the new `data/session.json`, and re-run `tofu apply`.

## 7. Monitoring

The infrastructure sets up:

- **Container App Environment**: Provides built-in execution logs accessible via the Azure portal under the Container App Environment's log stream.
- **Weekly Job Summary**: A separate container job that runs every Saturday at 2 PM UTC (8 AM Central Time) to send a weekly email summary of all job executions in the past 7 days with their final status and coupon counts. Only created when SMTP variables are provided.
