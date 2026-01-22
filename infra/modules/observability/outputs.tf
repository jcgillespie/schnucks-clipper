output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.this.id
}

output "log_analytics_workspace_customer_id" {
  description = "Customer ID (workspace ID) for Log Analytics REST API queries"
  value       = azurerm_log_analytics_workspace.this.workspace_id
}

output "action_group_id" {
  value = azurerm_monitor_action_group.this.id
}
