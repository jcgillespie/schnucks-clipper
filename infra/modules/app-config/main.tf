resource "azurerm_app_configuration" "this" {
  name                = var.app_config_name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "free"

  # Enable purge protection to prevent accidental deletion
  purge_protection_enabled = false

  # Encryption defaults to service-managed
  tags = {
    environment = var.environment
    project     = var.project_name
  }
}
