resource "azurerm_container_app_environment" "this" {
  name                = var.environment_name
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_container_app_job" "this" {
  name                         = var.job_name
  location                     = var.location
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id

  identity {
    type = "SystemAssigned"
  }

  replica_timeout_in_seconds = 300
  replica_retry_limit        = 1

  secret {
    name  = "registry-password"
    value = var.registry_password
  }

  secret {
    name  = "session-json-b64"
    value = var.session_json_b64
  }

  secret {
    name  = "app-config-connection"
    value = var.app_config_connection_string
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

      env {
        name        = "SESSION_JSON_B64"
        secret_name = "session-json-b64"
      }

      env {
        name  = "APP_CONFIG_ENDPOINT"
        value = var.app_config_endpoint
      }

      env {
        name        = "APP_CONFIG_CONNECTION_STRING"
        secret_name = "app-config-connection"
      }

      env {
        name  = "LOG_LEVEL"
        value = "info"
      }
    }


  }
}
