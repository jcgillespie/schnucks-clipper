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

  secret {
    name  = "session-json-b64"
    value = var.session_json_b64
  }

  secret {
    name  = "app-config-connection"
    value = var.app_config_connection_string
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
        name        = "SESSION_JSON_B64"
        secret_name = "session-json-b64"
      }

      env {
        name  = "APP_CONFIG_ENDPOINT"
        value = var.app_config_endpoint
      }

      env {
        name        = "APP_CONFIG_CONNECTION_STRING"
        secret_name = "app-config-connection"
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
