resource "azurerm_log_analytics_workspace" "this" {
  name                = "${var.project_name}-${var.environment}-log-analytics"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
}

resource "azurerm_monitor_action_group" "this" {
  name                = "${var.project_name}-${var.environment}-action-group"
  resource_group_name = var.resource_group_name
  short_name          = "ClipperAlert"

  email_receiver {
    name                    = "ClipperAdmin"
    email_address           = var.action_group_email
    use_common_alert_schema = true
  }
}

resource "azurerm_monitor_scheduled_query_rules_alert" "app_health" {
  name                = "${var.project_name}-${var.environment}-app-health"
  location            = var.location
  resource_group_name = var.resource_group_name

  depends_on = [azurerm_log_analytics_workspace.this]

  action {
    action_group = [azurerm_monitor_action_group.this.id]
  }

  data_source_id = azurerm_log_analytics_workspace.this.id
  description    = "Alert when the clipper job encountered a fatal error or session issue"
  enabled        = true

  query = <<-KQL
    ContainerAppConsoleLogs_CL
    | where ContainerJobName_s == "${var.project_name}-${var.environment}-job"
    | where Log_s contains "ERROR"
      or Log_s contains "Exception"
      or Log_s contains "MISSING_CLIENT_ID"
      or Log_s contains "RE-AUTHENTICATE"
  KQL

  severity    = 1
  frequency   = 5
  time_window = 5

  trigger {
    operator  = "GreaterThan"
    threshold = 0
  }
}

resource "azurerm_monitor_scheduled_query_rules_alert" "job_failure" {
  name                = "${var.project_name}-${var.environment}-job-failure"
  location            = var.location
  resource_group_name = var.resource_group_name

  depends_on = [azurerm_log_analytics_workspace.this]

  action {
    action_group = [azurerm_monitor_action_group.this.id]
  }

  data_source_id = azurerm_log_analytics_workspace.this.id
  description    = "Alert when the clipper job fails at the system level (after retries)"
  enabled        = true

  query = <<-KQL
    let jobName = "${var.project_name}-${var.environment}-job";
    ContainerAppSystemLogs_CL
    | where JobName_s == jobName or Log_s has jobName
    | where Reason_s in ("BackoffLimitExceeded", "Error")
      or Log_s has "failed container"
      or Log_s matches regex @"exit code: [1-9]\d*"
      or Log_s has "exited with status Failed"
  KQL

  severity    = 1
  frequency   = 5
  time_window = 5

  trigger {
    operator  = "GreaterThan"
    threshold = 1
  }
}
