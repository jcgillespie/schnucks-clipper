# Research: Schnucks Coupon Clipper

**Feature**: 1-coupon-clipper | **Date**: 2026-01-16

## Technology Decisions

### Node.js Runtime

| Decision | Node.js 20 LTS (Alpine) |
|----------|-------------------------|
| **Rationale** | LTS version ensures long-term support; Alpine base reduces image size significantly |
| **Alternatives** | Node.js 18 (older), Node.js 21 (not LTS) |

### Playwright vs Puppeteer

| Decision | Playwright |
|----------|------------|
| **Rationale** | Native persistent context support, better reliability, official Docker images, active development |
| **Alternatives** | Puppeteer (requires additional session management code, less reliable context persistence) |

### Container Base Image

| Decision | Multi-stage: Alpine (build) + Playwright official (runtime) |
|----------|-------------------------------------------------------------|
| **Rationale** | Playwright official image guarantees browser compatibility; Alpine build stage minimizes dependencies |
| **Alternatives** | Pure Alpine (complex browser dependency management), Node.js official (larger image) |

### Terraform over ARM/Bicep

| Decision | Terraform |
|----------|-----------|
| **Rationale** | Cloud-agnostic, mature ecosystem, state management, widely adopted |
| **Alternatives** | ARM templates (verbose, Azure-only), Bicep (Azure-only, less mature) |

### Azure Container App Jobs

| Decision | Container App Jobs (not Container Instances) |
|----------|----------------------------------------------|
| **Rationale** | Built-in scheduling, free tier available, native File Share mounting, managed environment |
| **Alternatives** | Container Instances (no scheduler, need separate trigger), Functions (less container-friendly) |

---

## Best Practices Applied

### Session Persistence with Playwright

- Use `browserContext.storageState()` to export cookies/localStorage
- Use `browser.newContext({ storageState: path })` to restore
- Store in JSON format at `/home/playwright/data/session.json`
- Check session validity by making test API call before full run

### API Rate Limiting

- Implement exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum 5 retries before failing
- Respect `Retry-After` header if present
- Log all retry attempts for debugging

### Azure Always Free Tier

- Storage Account: 5 GB limit, Standard_LRS
- Container Apps: 180,000 vCPU-seconds/month free
- Estimated usage: ~30 seconds/run × 30 runs/month = 900 seconds (well under limit)

### GitHub Actions Secrets Management

- Use `AZURE_CREDENTIALS` secret for service principal auth
- Store Terraform state in Azure Storage (separate from app storage)
- Use OIDC federation where possible for enhanced security

---

## Unresolved Items

None. All technical decisions are finalized.
