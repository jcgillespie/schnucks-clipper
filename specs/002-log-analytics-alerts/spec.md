# Feature Specification: Log Analytics & Alerts

**Feature Branch**: `002-log-analytics-alerts`  
**Created**: 2026-01-20  
**Status**: Draft  
**Input**: User description: "use log analytics to capture the output of the clipper and to send me an alert when the session data needs to be refreshed or there are execution errors."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Failure Visibility (Priority: P1)

As a user, I want to be notified immediately when the clipper job fails so that I can investigate and fix any system or connectivity issues.

**Why this priority**: Ensuring the clipper runs successfully is the primary goal of the project. Manual monitoring is inefficient.

**Independent Test**: Simulate a job failure (e.g., by providing an invalid URL) and verify that an alert is received on the configured channel.

**Acceptance Scenarios**:

1. **Given** the clipper job starts, **When** it encounters a fatal execution error, **Then** an alert notification is sent within 5 minutes.
2. **Given** an alert is triggered, **When** the user clicks the notification, **Then** they are directed to the specific log entry in Azure Log Analytics.

---

### User Story 2 - Session Expiry Monitoring (Priority: P1)

As a user, I want to be alerted specifically when the session metadata needs to be refreshed (re-authentication) so that I don't miss out on coupons due to expired credentials.

**Why this priority**: Re-authentication is a manual step (TFA) and is the most common point of failure for long-running scrapers.

**Independent Test**: Use an expired `session.json` and verify that the system correctly identifies the "Unauthorized" or "Missing Client ID" error as a "Session Refresh Required" event.

**Acceptance Scenarios**:

1. **Given** an expired session file, **When** the clipper attempts to authenticate, **Then** a specific "Session Refresh Required" alert is triggered.

---

### User Story 3 - Historical Log Analysis (Priority: P2)

As a developer, I want all clipper output to be persisted in a central location so that I can analyze trends or debug intermittent failures without needing local console access.

**Why this priority**: Essential for long-term reliability and auditing.

**Independent Test**: Execute a job and perform a KQL query in Log Analytics to verify 100% log ingestion.

**Acceptance Scenarios**:

1. **Given** a successful or failed execution, **When** I query Log Analytics, **Then** I see the complete STDOUT/STDERR stream from the container.

---

### Edge Cases

- **Partial Success**: What happens if some coupons clip but the job eventually fails?
- **Log Throttle**: How does the system handle an unusually high volume of logs (e.g., if the app enters an infinite loop)?
- **Alert Fatigue**: What happens if the job runs every hour and fails? Will the user get 24 emails?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST integrate the Azure Container App Job with a Log Analytics Workspace.
- **FR-002**: System MUST capture both `STDOUT` and `STDERR` from the clipper container.
- **FR-003**: System MUST define an Azure Monitor Alert Rule based on log patterns indicating a fatal error (e.g., Log Level "ERROR" or specific Exception types).
- **FR-004**: System MUST define a separate Alert Rule or Filter for "Session Expired" states (e.g., searching for keywords like "AUTHENTICATION_FAILED" or "RE-AUTHENTICATE").
- **FR-005**: System MUST use an Azure Monitor Action Group to deliver notifications to the user.
- **FR-006**: Alerts MUST include a link to the specific execution logs for rapid troubleshooting.

### Key Entities

- **Log Analytics Workspace**: The central repository for all ingested logs.
- **Alert Rule**: Logic that scans incoming log streams for predefined failure patterns.
- **Action Group**: Definition of the communication channel (Email/SMS) and recipients.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of "Fatal" errors result in a notification within 10 minutes of execution failure.
- **SC-002**: 0 instances of missed coupon clipping windows due to undetected session expiry.
- **SC-003**: Log retention is configured for at least 30 days to allow for monthly trend analysis.
- **SC-004**: Users receive no more than 1 notification per unique failure event (avoiding alert storms).
