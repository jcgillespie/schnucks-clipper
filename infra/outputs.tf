output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "app_config_name" {
  value = module.app_config.app_config_name
}

output "app_config_endpoint" {
  value = module.app_config.app_config_endpoint
}

output "container_app_job_id" {
  value = module.container_job.container_app_job_id
}
