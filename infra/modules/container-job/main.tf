resource "azurerm_container_app_environment" "this" {
  name                       = var.environment_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id
}

resource "azurerm_container_app_environment_storage" "this" {
  name                         = "clipper-storage"
  container_app_environment_id = azurerm_container_app_environment.this.id
  account_name                 = var.storage_account_name
  share_name                   = var.file_share_name
  access_key                   = var.storage_account_key
  access_mode                  = "ReadWrite"
}

resource "azurerm_container_app_job" "this" {
  name                         = var.job_name
  location                     = var.location
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id

  replica_timeout_in_seconds = 300
  replica_retry_limit        = 1

  secret {
    name  = "registry-password"
    value = var.registry_password
  }

  registry {
    server               = var.registry_server
    username             = var.registry_username
    password_secret_name = "registry-password"
  }

  schedule_trigger_config {
    cron_expression = var.cron_schedule
  }

  template {
    container {
      image  = var.image_name
      name   = "clipper"
      cpu    = var.cpu
      memory = var.memory

      volume_mounts {
        name = "clipper-data"
        path = "/data"
      }

      env {
        name  = "DATA_PATH"
        value = "/data"
      }
      env {
        name  = "SESSION_FILE"
        value = "/data/session.json"
      }
      env {
        name  = "LOG_LEVEL"
        value = "warn" # Reduce log verbosity to minimize Azure Monitor costs
      }
    }

    volume {
      name         = "clipper-data"
      storage_name = azurerm_container_app_environment_storage.this.name
      storage_type = "AzureFile"
    }
  }
}
