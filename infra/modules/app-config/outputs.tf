output "app_config_id" {
  description = "ID of the App Configuration store"
  value       = azurerm_app_configuration.this.id
}

output "app_config_name" {
  description = "Name of the App Configuration store"
  value       = azurerm_app_configuration.this.name
}

output "app_config_endpoint" {
  description = "Endpoint URL of the App Configuration store"
  value       = azurerm_app_configuration.this.endpoint
}

output "app_config_primary_read_key" {
  description = "Primary read key for App Configuration"
  value       = azurerm_app_configuration.this.primary_read_key[0].connection_string
  sensitive   = true
}
