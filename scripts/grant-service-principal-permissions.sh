#!/usr/bin/env bash
# Script to grant "User Access Administrator" role to the service principal
# This is required for the weekly summary feature to create role assignments
#
# IMPORTANT: This is a ONE-TIME setup script that should be run manually,
# NOT as part of the CD pipeline. Run this before deploying the weekly summary feature.
#
# Usage:
#   export AZURE_CLIENT_ID="<your-service-principal-app-id>"
#   export AZURE_SUBSCRIPTION_ID="<your-subscription-id>"
#   bash ./scripts/grant-service-principal-permissions.sh [resource-group-name]
#   OR
#   ./scripts/grant-service-principal-permissions.sh [resource-group-name]  (if executable)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Granting User Access Administrator role to service principal...${NC}"
echo ""

# Check if AZURE_CLIENT_ID is set
if [ -z "$AZURE_CLIENT_ID" ]; then
  echo -e "${RED}Error: AZURE_CLIENT_ID environment variable is not set.${NC}"
  echo "Please set it from your GitHub secret:"
  echo "  export AZURE_CLIENT_ID=\"<your-service-principal-app-id>\""
  exit 1
fi

# Check if subscription ID is set
if [ -z "$AZURE_SUBSCRIPTION_ID" ]; then
  echo -e "${RED}Error: AZURE_SUBSCRIPTION_ID environment variable is not set.${NC}"
  echo "Please set it:"
  echo "  export AZURE_SUBSCRIPTION_ID=\"<your-subscription-id>\""
  exit 1
fi

# Check if resource group name is provided (optional)
RESOURCE_GROUP="${1:-}"

if [ -n "$RESOURCE_GROUP" ]; then
  echo -e "${YELLOW}Granting role at resource group level: ${RESOURCE_GROUP}${NC}"
  SCOPE="/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}"
else
  echo -e "${YELLOW}Granting role at subscription level (recommended)${NC}"
  SCOPE="/subscriptions/${AZURE_SUBSCRIPTION_ID}"
fi

echo ""
echo "Service Principal ID: $AZURE_CLIENT_ID"
echo "Scope: $SCOPE"
echo ""

# Grant the role
az role assignment create \
  --assignee "$AZURE_CLIENT_ID" \
  --role "User Access Administrator" \
  --scope "$SCOPE"

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Successfully granted 'User Access Administrator' role to service principal${NC}"
  echo ""
  echo "The service principal can now create role assignments for the weekly summary job."
  echo "You can now re-run your Terraform/OpenTofu deployment to complete the role assignment."
else
  echo ""
  echo -e "${RED}✗ Failed to grant role. Please check:${NC}"
  echo "  1. You have sufficient permissions to create role assignments"
  echo "  2. The service principal ID is correct"
  echo "  3. The subscription ID is correct"
  exit 1
fi
