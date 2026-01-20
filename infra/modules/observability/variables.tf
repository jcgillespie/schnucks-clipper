variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "action_group_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "log_retention_days" {
  description = "Retention period for Log Analytics logs (days)"
  type        = number
}
