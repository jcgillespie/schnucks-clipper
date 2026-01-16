# Schnucks Coupon Clipper

Automated tool to clip Schnucks coupons using Playwright and Node.js.

## Deployment & CI/CD

The project uses GitHub Actions for CI/CD. The following secrets must be configured in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Azure Service Principal Client ID |
| `AZURE_CLIENT_SECRET` | Azure Service Principal Client Secret |
| `AZURE_TENANT_ID` | Azure Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID |
| `AZURE_CREDENTIALS` | (Alternative/Full) Azure SPN JSON |
| `GHCR_TOKEN` | GitHub Container Registry token (or use standard `GITHUB_TOKEN` in workflows) |

## Local Development

1. `npm install`
2. Create `.env` from `.env.example`
3. `npm run dev`
