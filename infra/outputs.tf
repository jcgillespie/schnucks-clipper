output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "storage_account_name" {
  value = module.storage.storage_account_name
}

output "file_share_name" {
  value = module.storage.file_share_name
}

output "storage_account_key" {
  value     = module.storage.primary_access_key
  sensitive = true
}

output "container_app_job_id" {
  value = module.container_job.container_app_job_id
}
