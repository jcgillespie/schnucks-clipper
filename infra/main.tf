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
}
