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

# Weekly Summary Email Configuration (optional)
variable "smtp_host" {
  description = "SMTP server hostname (e.g., smtp.mailgun.org)"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP server port (default: 587 for TLS)"
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "SMTP username (e.g., your Mailgun email address)"
  type        = string
  default     = ""
}

variable "smtp_password" {
  description = "SMTP password (e.g., your Mailgun API key)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "weekly_summary_email_from" {
  description = "Email address to send weekly summary from"
  type        = string
  default     = ""
}

variable "weekly_summary_email_to" {
  description = "Email address to send weekly summary to (defaults to action_group_email if not set)"
  type        = string
  default     = ""
}
