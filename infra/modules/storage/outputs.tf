output "storage_account_name" {
  value = azurerm_storage_account.this.name
}

output "file_share_name" {
  value = azurerm_storage_share.this.name
}

output "primary_access_key" {
  value     = azurerm_storage_account.this.primary_access_key
  sensitive = true
}
