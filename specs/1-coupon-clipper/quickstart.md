# Quickstart: Schnucks Coupon Clipper

## Prerequisites

- Node.js 20+
- Docker (for container builds)
- Terraform 1.5+ (for infrastructure)
- Azure CLI (authenticated)
- GitHub account with Actions enabled

## Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd schnucks-coupons
npm install

# 2. Install Playwright browser
npx playwright install chromium

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Run in development mode
npm run dev
```

## Initial Session Setup

The first run requires manual authentication:

```bash
# Start interactive session
npm run session:init

# This opens a browser - log into Schnucks manually
# Complete any TFA prompts
# Session is saved to ./data/session.json
```

## Running the Clipper

```bash
# Development (TypeScript)
npm run dev

# Production (compiled)
npm run build
npm start
```

## Docker

```bash
# Build image
docker build -t schnucks-clipper:latest .

# Run with session volume
docker run -v $(pwd)/data:/home/playwright/data schnucks-clipper:latest
```

## Infrastructure Deployment

```bash
cd infra

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy
terraform apply
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Lint check
npm run lint

# Type check
npm run typecheck
```

## Project Structure

```
src/           # Application source code
tests/         # Unit and integration tests
infra/         # Terraform modules
.github/       # CI/CD workflows
specs/         # Feature specifications
```
