# Research: Log Analytics & Alerts

## Decision: Azure Native Monitoring

We will use Azure Log Analytics combined with Azure Monitor scheduled query rules.

### Rationale:

- **Zero code change**: Container App Jobs automatically stream STDOUT/STDERR to the linked Log Analytics workspace.
- **Cost-effective**: Log Analytics has a generous free tier for ingestion and retention for small projects.
- **Power**: KQL (Kusto Query Language) allows for precise filtering to avoid alert fatigue.
- **Reliability**: Managed by Azure, no additional infrastructure to maintain.

## KQL Query Patterns

### Fatal Execution Errors

```kusto
ContainerAppConsoleLogs_CL
| where ContainerJobName_s == "schnucks-clipper-prod-job"
| where Log_s contains "ERROR" or Log_s contains "Exception"
| project TimeGenerated, Log_s
```

### Session Refresh Required

```kusto
ContainerAppConsoleLogs_CL
| where ContainerJobName_s == "schnucks-clipper-prod-job"
| where Log_s contains "MISSING_CLIENT_ID" or Log_s contains "RE-AUTHENTICATE"
| project TimeGenerated, Log_s
```

## Infrastructure Best Practices (OpenTofu/Terraform)

- **Workspace**: Use `azurerm_log_analytics_workspace`.
- **Linking**: The `azurerm_container_app_environment` must have `log_analytics_workspace_id` configured.
- **Alert Rules**: Use `azurerm_monitor_scheduled_query_rules_alert`. It allows us to define the frequency (e.g., every 5 minutes) and the threshold (e.g., > 0 records found).
- **Action Groups**: Use `azurerm_monitor_action_group`. This decouples the communication channel (who gets notified) from the alert logic (what triggers the notification).

## Alternatives Considered

1.  **Custom Webhooks**: Implement a webhook in the Node.js app to send a Discord/Slack message.
    - **Rejected because**: Requires more code, secret management, and handling retries within the app. Doesn't capture "silent" failures where the app crashes before sending the message.
2.  **Azure Application Insights**: Use the App Insights SDK.
    - **Rejected because**: Overkill for a simple CLI scraper. Log-based alerting is simpler and covers all requirements.
