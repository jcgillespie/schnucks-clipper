resource "azurerm_resource_group" "this" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location
}

module "storage" {
  source = "./modules/storage"

  resource_group_name  = azurerm_resource_group.this.name
  location             = var.location
  storage_account_name = replace("${var.project_name}${var.environment}st", "-", "")
}

module "container_job" {
  source = "./modules/container-job"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  environment_name    = "${var.project_name}-${var.environment}-env"
  job_name            = "${var.project_name}-${var.environment}-job"
  image_name          = var.image_name
  cron_schedule       = var.cron_schedule

  storage_account_name = module.storage.storage_account_name
  storage_account_key  = module.storage.primary_access_key
  file_share_name      = module.storage.file_share_name

  registry_server   = var.registry_server
  registry_username = var.registry_username
  registry_password = var.registry_password

  log_analytics_workspace_id            = module.observability.log_analytics_workspace_id
  log_analytics_workspace_customer_id   = module.observability.log_analytics_workspace_customer_id

  # Weekly summary configuration (optional)
  smtp_host     = var.smtp_host
  smtp_port     = var.smtp_port
  smtp_user     = var.smtp_user
  smtp_password = var.smtp_password
  email_from    = var.weekly_summary_email_from
  email_to      = var.weekly_summary_email_to != "" ? var.weekly_summary_email_to : var.action_group_email
}

module "observability" {
  source = "./modules/observability"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  project_name        = var.project_name
  environment         = var.environment

  action_group_email = var.action_group_email
  log_retention_days = var.log_retention_days
}
