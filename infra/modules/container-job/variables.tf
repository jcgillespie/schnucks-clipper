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

variable "app_config_endpoint" {
  description = "Endpoint URL of the App Configuration store"
  type        = string
}

variable "session_json_b64" {
  description = "Base64-encoded session.json content"
  type        = string
  sensitive   = true
  default     = ""
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
