# Weekly summary job - only create if SMTP is configured
locals {
  weekly_summary_enabled = var.smtp_host != "" && var.smtp_user != "" && var.smtp_password != "" && var.email_from != "" && var.email_to != ""
}

resource "azurerm_container_app_job" "weekly_summary" {
  count                        = local.weekly_summary_enabled ? 1 : 0
  name                         = "${var.job_name}-ws"
  location                     = var.location
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id

  identity {
    type = "SystemAssigned"
  }

  replica_timeout_in_seconds = 600 # 10 minutes for query + email
  replica_retry_limit        = 1

  secret {
    name  = "registry-password"
    value = var.registry_password
  }

  secret {
    name  = "smtp-password"
    value = var.smtp_password
  }

  registry {
    server               = var.registry_server
    username             = var.registry_username
    password_secret_name = "registry-password"
  }

  schedule_trigger_config {
    cron_expression = "0 14 * * 6" # Saturday at 2 PM UTC (8 AM Central Time)
  }

  template {
    container {
      image  = var.image_name
      name   = "weekly-summary"
      cpu    = 0.25
      memory = "0.5Gi"

      # Use same image, different job type
      env {
        name  = "JOB_TYPE"
        value = "weekly-summary"
      }

      env {
        name  = "HEALTH_DIGEST_SCHEDULE"
        value = "weekly" # Run as weekly health digest
      }

      env {
        name  = "HEALTH_DIGEST_SEND_ON_SUCCESS"
        value = "true" # Always send email, even on success
      }

      env {
        name  = "LOG_LEVEL"
        value = "warn" # Reduce log verbosity in production
      }

      env {
        name  = "LOG_ANALYTICS_WORKSPACE_ID"
        value = var.log_analytics_workspace_customer_id
      }
      env {
        name  = "SMTP_HOST"
        value = var.smtp_host
      }
      env {
        name  = "SMTP_PORT"
        value = tostring(var.smtp_port)
      }
      env {
        name  = "SMTP_USER"
        value = var.smtp_user
      }
      env {
        name        = "SMTP_PASS"
        secret_name = "smtp-password"
      }
      env {
        name  = "EMAIL_FROM"
        value = var.email_from
      }
      env {
        name  = "EMAIL_TO"
        value = var.email_to
      }
      env {
        name  = "JOB_NAME"
        value = var.job_name
      }
    }
  }
}

# Grant Log Analytics Reader role to managed identity
# 
# IMPORTANT: This requires the service principal (used by GitHub Actions) to have 
# "User Access Administrator" or "Owner" role at the subscription or resource group level.
#
# If this fails with a 403 AuthorizationFailed error, you have two options:
# 1. Grant the service principal "User Access Administrator" role (recommended for automation)
# 2. Manually assign the role after deployment:
#    az role assignment create \
#      --assignee $(az containerapp job identity show \
#        --name schnucks-clipper-prod-job-ws \
#        --resource-group schnucks-clipper-prod-rg \
#        --query principalId -o tsv) \
#      --role "Log Analytics Reader" \
#      --scope <workspace_id>
resource "azurerm_role_assignment" "weekly_summary_log_reader" {
  count                = local.weekly_summary_enabled ? 1 : 0
  scope                = var.log_analytics_workspace_id
  role_definition_name = "Log Analytics Reader"
  principal_id         = azurerm_container_app_job.weekly_summary[0].identity[0].principal_id

  # Explicit dependency to ensure the managed identity is fully propagated in Azure AD
  # before attempting to create the role assignment
  depends_on = [azurerm_container_app_job.weekly_summary]
}
