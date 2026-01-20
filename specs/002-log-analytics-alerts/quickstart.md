# Quickstart: Monitoring & Alerts

This guide explains how to use the monitoring and alerting features for the Schnucks Coupon Clipper.

## 1. View Logs in Real-time
You can stream logs directly from your terminal:

```bash
az containerapp job execution list \
  --name schnucks-clipper-prod-job \
  --resource-group schnucks-clipper-prod-rg \
  --query "[0].name" -o tsv | xargs -I {} az containerapp job logs show \
  --name schnucks-clipper-prod-job \
  --resource-group schnucks-clipper-prod-rg \
  --execution {} \
  --container clipper \
  --follow
```

## 2. Query Logs in Azure Portal
1. Go to the **Azure Portal**.
2. Navigate to your **Log Analytics Workspace** (`schnucks-clipper-prod-log-analytics`).
3. Click on **Logs** in the left sidebar.
4. Paste the following query to see all clipper activity:
   ```kusto
   ContainerAppConsoleLogs_CL
   | where ContainerJobName_s == "schnucks-clipper-prod-job"
   | order by TimeGenerated desc
   ```

## 3. Alerts
Once implemented, you will receive notifications via the configured **Action Group**.

- **Fatal Error Alert**: Triggered if "ERROR" or "Exception" appears in the logs.
- **Session Expiry Alert**: Triggered if "MISSING_CLIENT_ID" appears, indicating you need to re-run `npm run session:init` and upload the new `session.json`.

## 4. Troubleshooting Alerts
When you receive an alert email:
1. Click the **"View Logs"** link in the email.
2. Identify the failure reason.
3. If it's a session expiry, refresh your session locally and upload it to the Azure File Share (`clipper-data`).
