#!/usr/bin/env bash
set -euo pipefail
CLUSTER_NAME="${1:?Usage: ./install.sh <cluster-name> <region>}"
REGION="${2:?Usage: ./install.sh <cluster-name> <region>}"
aws eks create-addon --cluster-name "${CLUSTER_NAME}" --addon-name amazon-cloudwatch-observability --region "${REGION}"   || aws eks update-addon --cluster-name "${CLUSTER_NAME}" --addon-name amazon-cloudwatch-observability --region "${REGION}" --resolve-conflicts OVERWRITE
aws eks describe-addon --cluster-name "${CLUSTER_NAME}" --addon-name amazon-cloudwatch-observability --region "${REGION}" --query 'addon.status'
