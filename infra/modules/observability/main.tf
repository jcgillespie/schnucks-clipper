# Log Analytics Workspace - Required for Container Apps diagnostics
# Logs are stored here and queried by the daily health digest job
resource "azurerm_log_analytics_workspace" "this" {
  name                = "${var.project_name}-${var.environment}-log-analytics"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
}

