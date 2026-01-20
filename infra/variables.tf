variable "project_name" {
  description = "Project name used for naming resources"
  type        = string
  default     = "schnucks-clipper"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "Central US"
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
  default     = "prod"
}

variable "image_name" {
  description = "Full Docker image name and tag"
  type        = string
}

variable "cron_schedule" {
  description = "CRON schedule for the job"
  type        = string
  default     = "0 10 * * *" # 10 AM Daily
}

variable "registry_server" {
  description = "Container registry server"
  type        = string
  default     = "ghcr.io"
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

variable "action_group_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "log_retention_days" {
  description = "Retention period for Log Analytics logs (days)"
  type        = number
  default     = 30
}
