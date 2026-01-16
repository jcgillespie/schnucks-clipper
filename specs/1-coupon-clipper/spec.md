# Feature Specification: Schnucks Coupon Clipper

**Feature Branch**: `1-coupon-clipper`  
**Created**: 2026-01-16  
**Status**: Draft  
**Input**: User description: "Build a lightweight Node.js/Playwright app to clip coupons using an existing session. Dockerized application with Alpine-based multi-stage build. Infrastructure as Code using Terraform for Azure Container App Jobs and Azure File Share. CI/CD Pipelines using GitHub Actions."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automated Coupon Clipping (Priority: P1)

As a Schnucks customer, I want all available coupons to be automatically clipped to my account so that I receive discounts without manually browsing and clicking each coupon.

**Why this priority**: This is the core value proposition of the application. Without automated clipping, the entire system has no purpose. This delivers immediate, tangible value to users by saving time and ensuring no coupons are missed.

**Independent Test**: Can be fully tested by running the application with a valid session and verifying that previously unclipped coupons are now marked as clipped in the Schnucks account.

**Acceptance Scenarios**:

1. **Given** a valid authenticated session exists in `/home/playwright/data`, **When** the application runs, **Then** all available coupons from the API are clipped to the user's account.
2. **Given** an authenticated session exists, **When** the application retrieves coupons via `GET api/coupon-api/v1/coupons`, **Then** the response contains an `availableCoupons` array that the system iterates through.
3. **Given** available coupons exist, **When** the system processes each coupon, **Then** it sends a `POST` request to `api/coupon-api/v1/clipped` for each coupon.
4. **Given** some coupons are already clipped, **When** the application runs, **Then** only unclipped coupons are processed (no duplicate clipping attempts).

---

### User Story 2 - Session Persistence Across Runs (Priority: P1)

As the system operator, I want the browser session to persist between runs so that I don't have to manually re-authenticate frequently.

**Why this priority**: Session persistence is critical for unattended operation. Without it, the system requires manual intervention for each run, defeating the automation purpose.

**Independent Test**: Can be tested by running the application twice in succession and verifying that the second run uses the existing session without requiring login.

**Acceptance Scenarios**:

1. **Given** a Playwright browser context with valid session cookies, **When** the session is saved, **Then** it is persisted to Azure File Share at `/home/playwright/data`.
2. **Given** a persisted session exists in storage, **When** the application starts, **Then** it loads the existing session context instead of starting fresh.
3. **Given** a session has expired or is invalid, **When** the application detects authentication failure, **Then** it logs an error message instructing the user to perform manual TFA re-authentication.

---

### User Story 3 - Containerized Deployment (Priority: P2)

As a DevOps engineer, I want the application packaged as a minimal Docker container so that it can be deployed consistently across environments with minimal resource consumption.

**Why this priority**: Containerization enables consistent deployment and Azure integration. While not user-facing, it's essential for the operational model.

**Independent Test**: Can be tested by building the Docker image and verifying it runs successfully in isolation, completing a coupon clipping cycle.

**Acceptance Scenarios**:

1. **Given** the Dockerfile uses multi-stage build with Alpine base, **When** the image is built, **Then** the final image size is under 500MB.
2. **Given** the Docker container runs, **When** it mounts `/home/playwright/data` from Azure File Share, **Then** session data persists across container restarts.
3. **Given** the container requires Playwright with Chromium, **When** the image is built, **Then** all necessary browser dependencies are included and functional.

---

### User Story 4 - Azure Infrastructure Provisioning (Priority: P2)

As a DevOps engineer, I want infrastructure defined as code using Terraform so that I can provision and manage Azure resources consistently and repeatably.

**Why this priority**: Infrastructure as Code is essential for maintainability and cost control. It enables reproducible deployments and proper resource management.

**Independent Test**: Can be tested by running `terraform plan` and `terraform apply` against an Azure subscription and verifying resources are created correctly.

**Acceptance Scenarios**:

1. **Given** Terraform configuration files exist, **When** `terraform apply` is executed, **Then** an Azure Container App Job is created.
2. **Given** Terraform configuration files exist, **When** `terraform apply` is executed, **Then** an Azure File Share is created for session persistence.
3. **Given** the infrastructure targets Azure's Always Free tier, **When** resources are provisioned, **Then** no charges are incurred for base resource allocation.
4. **Given** the Container App Job is created, **When** it is triggered, **Then** it mounts the Azure File Share to `/home/playwright/data`.

---

### User Story 5 - Automated CI/CD Pipeline (Priority: P3)

As a developer, I want GitHub Actions to automate building, testing, and deploying the application so that changes are consistently validated and deployed.

**Why this priority**: CI/CD automation improves developer experience and reduces manual deployment errors. It's important for long-term maintainability but can be set up after core functionality works.

**Independent Test**: Can be tested by pushing a commit to the repository and verifying that the pipeline executes successfully, building the Docker image and deploying to Azure.

**Acceptance Scenarios**:

1. **Given** a GitHub Actions workflow exists, **When** code is pushed to the main branch, **Then** the Docker image is automatically built.
2. **Given** a GitHub Actions workflow exists, **When** a release is tagged, **Then** Terraform applies infrastructure changes and deploys the new container image.
3. **Given** the deployment pipeline runs, **When** deployment completes, **Then** the Azure Container App Job is updated with the new image version.
4. **Given** the workflow has secrets configured, **When** the pipeline runs, **Then** Azure credentials are securely passed to Terraform and Docker.

---

### Edge Cases

- What happens when the Schnucks API is temporarily unavailable? → System logs error and exits gracefully with error code.
- What happens when session cookies expire mid-run? → System detects authentication failure and logs instructions for manual TFA re-authentication.
- What happens when rate limiting is encountered on the API? → System implements exponential backoff with configurable retry limits.
- What happens when Azure File Share is unavailable? → System logs error and fails fast rather than proceeding without session persistence.
- What happens when there are zero available coupons? → System logs informational message and exits successfully.
- What happens when network connectivity is lost during coupon clipping? → Partial progress is logged, and remaining coupons are not clipped until next run.

## Requirements _(mandatory)_

### Functional Requirements

#### Core Application

- **FR-001**: System MUST retrieve available coupons via `GET api/coupon-api/v1/coupons` endpoint using provided authentication headers and cookies.
- **FR-002**: System MUST iterate through the `availableCoupons` array in the API response.
- **FR-003**: System MUST clip each available coupon via `POST api/coupon-api/v1/clipped` endpoint.
- **FR-004**: System MUST use Playwright with persistent browser context for API calls to maintain session state.
- **FR-005**: System MUST load browser context from `/home/playwright/data` on startup if it exists.
- **FR-006**: System MUST save browser context to `/home/playwright/data` after successful operations.
- **FR-007**: System MUST detect session expiration or authentication failures and log actionable error messages.
- **FR-008**: System MUST log all clipping operations with coupon identifiers and success/failure status.

#### Session Management

- **FR-009**: System MUST persist Playwright browser context (cookies, localStorage, sessionStorage) to filesystem.
- **FR-010**: System MUST use the curl command headers and cookies provided by the user for API authentication.
- **FR-011**: System MUST exit with a clear error code and log message when session is invalid, instructing user to perform manual TFA authentication.

#### Docker Container

- **FR-012**: Dockerfile MUST use multi-stage build pattern to minimize final image size.
- **FR-013**: Dockerfile MUST use Alpine Linux as the base image.
- **FR-014**: Container MUST include Playwright and Chromium browser with all required dependencies.
- **FR-015**: Container MUST mount external volume at `/home/playwright/data` for session persistence.
- **FR-016**: Container MUST run as non-root user for security.

#### Terraform Infrastructure

- **FR-017**: Terraform MUST provision an Azure Container App Job for scheduled execution.
- **FR-018**: Terraform MUST provision an Azure File Share for session data persistence.
- **FR-019**: Terraform MUST configure resources within Azure's Always Free tier limits.
- **FR-020**: Terraform MUST configure the Container App Job to mount the File Share at `/home/playwright/data`.
- **FR-021**: Terraform MUST support configurable schedule for Container App Job execution.

#### CI/CD Pipeline

- **FR-022**: GitHub Actions MUST build Docker image on push to main branch.
- **FR-023**: GitHub Actions MUST push Docker image to a container registry (Azure Container Registry or GitHub Container Registry).
- **FR-024**: GitHub Actions MUST run `terraform plan` on pull requests for infrastructure validation.
- **FR-025**: GitHub Actions MUST run `terraform apply` on successful merge to main branch.
- **FR-026**: GitHub Actions MUST securely handle Azure credentials and Terraform state.

### Key Entities

- **Coupon**: Represents a single clippable coupon with unique identifier, description, and clipping status.
- **Session**: Represents the authenticated browser context including cookies, localStorage, and authentication tokens.
- **Job Run**: Represents a single execution of the coupon clipping process with timestamp, coupons processed, and result status.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Application clips all available coupons in a single run without manual intervention (100% automation rate for valid sessions).
- **SC-002**: Container image size is under 500MB to minimize deployment time and storage costs.
- **SC-003**: Session persists for at least 30 days without requiring manual re-authentication under normal usage.
- **SC-004**: Infrastructure deployment completes in under 10 minutes from Terraform apply.
- **SC-005**: CI/CD pipeline completes build and deploy in under 15 minutes.
- **SC-006**: System operates within Azure's Always Free tier, incurring $0 in monthly charges for base infrastructure.
- **SC-007**: Error messages provide clear, actionable instructions for recovery (tested via user feedback on error clarity).
- **SC-008**: Application executes successfully on a daily schedule without degradation over 30 consecutive days.

## Assumptions

- User has an existing Schnucks account with valid credentials.
- User can perform initial manual TFA authentication to establish the first session.
- User has access to an Azure subscription with permissions to create Container Apps and Storage accounts.
- User has a GitHub repository with Actions enabled.
- The Schnucks coupon API (`api/coupon-api/v1/coupons`, `api/coupon-api/v1/clipped`) remains stable and accessible.
- Azure's Always Free tier for Container Apps and Storage will remain available.

## Dependencies

- **External Service**: Schnucks coupon API availability and stability.
- **Platform**: Azure Container Apps, Azure File Share, Azure Container Registry.
- **Tools**: Node.js runtime, Playwright with Chromium, Terraform, GitHub Actions.
