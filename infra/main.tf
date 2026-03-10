resource "azurerm_resource_group" "this" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location
}

module "app_config" {
  source = "./modules/app-config"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  app_config_name     = replace("${var.project_name}-${var.environment}-config", "-", "")
  project_name        = var.project_name
  environment         = var.environment
}

module "container_job" {
  source = "./modules/container-job"

  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  environment_name    = "${var.project_name}-${var.environment}-env"
  job_name            = "${var.project_name}-${var.environment}-job"
  image_name          = var.image_name
  cron_schedule       = var.cron_schedule

  app_config_endpoint = module.app_config.app_config_endpoint
  app_config_connection_string = module.app_config.app_config_primary_write_key

  registry_server   = var.registry_server
  registry_username = var.registry_username
  registry_password = var.registry_password

  session_json_b64 = var.session_json_b64

  # Daily health digest configuration (optional)
  smtp_host     = var.smtp_host
  smtp_port     = var.smtp_port
  smtp_user     = var.smtp_user
  smtp_password = var.smtp_password
  email_from    = var.weekly_summary_email_from
  email_to      = var.weekly_summary_email_to
}
