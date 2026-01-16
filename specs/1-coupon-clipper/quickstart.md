# Quickstart: Schnucks Coupon Clipper

## Prerequisites

- **Node.js**: 20.x (LTS)
- **Docker**: For containerized runs and CI/CD validation.
- **OpenTofu**: (or Terraform 1.6+) for infrastructure management.
- **Azure CLI**: Logged in to the target subscription.

## Local Development Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Install Playwright Browser**:

   ```bash
   npx playwright install chromium
   ```

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Ensure SCHNUCKS_BASE_URL is set correctly (default: https://schnucks.com)
   ```

## Establishing a Session

Schnucks requires Multi-Factor Authentication (MFA). You must perform an initial login to save the session state.

```bash
npm run session:init
```

- This command launches a browser window.
- Log in to your Schnucks account.
- Complete the MFA (TFA) process.
- Once logged in, close the browser or wait for the script to finish.
- The session is saved to `./data/session.json`.

## Running the Clipper

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## Infrastructure & Deployment

### Resource Provisioning

```bash
cd infra
tofu init
tofu plan
tofu apply
```

### Docker

```bash
# Build the production image
docker build -t schnucks-clipper .

# Run with local session data
docker run -v $(pwd)/data:/home/playwright/data schnucks-clipper
```

## Quality Control

- **Tests**: `npm test`
- **Lint**: `npm run lint`
- **Type Check**: `npm run typecheck`
- **Format**: `npm run format`
