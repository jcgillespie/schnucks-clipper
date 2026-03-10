output "container_app_job_id" {
  value = azurerm_container_app_job.this.id
}

output "container_app_environment_id" {
  value = azurerm_container_app_environment.this.id
}

output "clipper_job_principal_id" {
  description = "Principal ID of the clipper job's system-assigned managed identity"
  value       = azurerm_container_app_job.this.identity[0].principal_id
}

output "weekly_summary_enabled" {
  value = local.weekly_summary_enabled
}

output "weekly_summary_principal_id" {
  description = "Principal ID of the weekly-summary job's system-assigned managed identity (null if disabled)"
  value       = try(azurerm_container_app_job.weekly_summary[0].identity[0].principal_id, null)
}
