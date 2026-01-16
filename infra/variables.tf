variable "project_name" {
  description = "Project name used for naming resources"
  type        = string
  default     = "schnucks-clipper"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
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
