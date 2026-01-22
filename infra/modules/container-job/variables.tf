variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "environment_name" {
  description = "Name of the Container Apps Environment"
  type        = string
}

variable "job_name" {
  description = "Name of the Container App Job"
  type        = string
}

variable "image_name" {
  description = "Docker image name and tag"
  type        = string
}

variable "cpu" {
  description = "CPU cores for the job"
  type        = number
  default     = 0.5
}

variable "memory" {
  description = "Memory for the job"
  type        = string
  default     = "1Gi"
}

variable "storage_account_name" {
  description = "Name of the storage account for mounting"
  type        = string
}

variable "storage_account_key" {
  description = "Access key for the storage account"
  type        = string
  sensitive   = true
}

variable "file_share_name" {
  description = "Name of the file share for mounting"
  type        = string
}

variable "cron_schedule" {
  description = "CRON schedule for the job"
  type        = string
  default     = "0 0 * * *" # Daily at midnight
}

variable "registry_server" {
  description = "Container registry server"
  type        = string
}

variable "registry_username" {
  description = "Container registry username"
  type        = string
}

variable "registry_password" {
  description = "Container registry password"
  type        = string
  sensitive   = true
}

variable "log_analytics_workspace_id" {
  description = "ID of the Log Analytics Workspace for logging"
  type        = string
}

variable "log_analytics_workspace_customer_id" {
  description = "Customer ID (workspace ID) of the Log Analytics Workspace for REST API queries"
  type        = string
}

variable "smtp_host" {
  description = "SMTP server hostname"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP server port"
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "SMTP username"
  type        = string
  default     = ""
}

variable "smtp_password" {
  description = "SMTP password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_from" {
  description = "Email address to send from"
  type        = string
  default     = ""
}

variable "email_to" {
  description = "Email address to send to"
  type        = string
  default     = ""
}
