terraform {
  required_version = ">= 1.5.0"

  backend "azurerm" {
    resource_group_name  = "schnucks-clipper-state-rg"
    storage_account_name = "schnucksstate1768858038"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}
