# Tasks: Log Analytics & Alerts

**Input**: Design documents from `/specs/002-log-analytics-alerts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Infrastructure preparation and variable definition.

- [x] T001 [P] Define `action_group_email` and `log_retention_days` in `infra/variables.tf`
- [x] T002 [P] Update `infra/modules/container-job/variables.tf` to accept `log_analytics_workspace_id`
- [x] T003 Update `infra/main.tf` to wire the Log Analytics output from a new module to the `container_job` module

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for observability.

- [x] T004 [P] Create `infra/modules/observability/main.tf` with `azurerm_log_analytics_workspace`
- [x] T005 [P] Create `infra/modules/observability/main.tf` with `azurerm_monitor_action_group` for email alerts
- [x] T006 Update `infra/modules/container-job/main.tf` to link the job environment to Log Analytics

---

## Phase 3: User Story 1 - Failure Visibility (Priority: P1) 🎯 MVP

**Goal**: Notify user when the clipper job encounters a fatal error.

**Independent Test**: Kill the container job with a synthetic error and verify email receipt.

### Implementation for User Story 1

- [x] T007 [US1] Define `azurerm_monitor_scheduled_query_rules_alert` in `infra/modules/observability/main.tf` for "Fatal Errors"
- [x] T008 [US1] Implement KQL logic for error detection: `Log_s contains "ERROR" or Log_s contains "Exception"`
- [x] T009 [US1] Configure the alert rule to trigger the Action Group created in T005

---

## Phase 4: User Story 2 - Session Expiry Monitoring (Priority: P1)

**Goal**: Notify user when re-authentication (TFA) via `session:init` is required.

**Independent Test**: Use an old session file and verify "Session Refresh Required" alert triggers.

### Implementation for User Story 2

- [x] T010 [US2] Define `azurerm_monitor_scheduled_query_rules_alert` in `infra/modules/observability/main.tf` for "Session Expiry"
- [x] T011 [US2] Implement KQL logic for session detection: `Log_s contains "MISSING_CLIENT_ID" or Log_s contains "RE-AUTHENTICATE"`
- [x] T012 [US2] Map alert severity to 'Severity 1' to distinguish from generic errors

---

## Phase 5: User Story 3 - Historical Log Analysis (Priority: P2)

**Goal**: Ensure logs are persisted for auditing and debugging.

**Independent Test**: Verify log presence in Log Analytics 24 hours after a job run.

### Implementation for User Story 3

- [x] T013 [US3] Set `retention_in_days` on the Log Analytics Workspace to the value from `var.log_retention_days`
- [x] T014 [US3] Verify `log_analytics_workspace` schema includes `ContainerAppConsoleLogs_CL`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation.

- [x] T015 [P] Update `README.md` with instructions on how to subscribe to alerts (Action Group)
- [x] T016 Perform manual "Live Log" validation using `quickstart.md` instructions
- [x] T017 Final `tofu apply` in CI/CD to verify end-to-end automation

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)**: Can start immediately.
2. **Foundational (Phase 2)**: Depends on T001-T003.
3. **User Stories (Phase 3-4)**: Parallelizable after Phase 2 is complete.
4. **Polish (Phase 6)**: After all infrastructure is applied.

### Parallel Opportunities

- T001, T002, T004, T005 are all parallelizable.
- US1 and US2 implementation can happen concurrently.

---

## Implementation Strategy

### MVP First (Visibility)
1. Setup Log Analytics (Phase 1 & 2).
2. Implement Fatal Error Alert (Phase 3).
3. Validate with synthetic failure.
