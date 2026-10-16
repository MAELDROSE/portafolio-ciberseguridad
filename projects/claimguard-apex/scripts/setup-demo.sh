#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
claimguard_org="${1:-claimguard}"
command -v sf >/dev/null || { echo 'Install the official Salesforce CLI first.' >&2; exit 1; }
sf org display --target-org "$claimguard_org" >/dev/null
npm ci --no-audit --no-fund
npm run check
sf project deploy start --target-org "$claimguard_org" --source-dir force-app --test-level RunLocalTests --wait 20
sf org assign permset --target-org "$claimguard_org" --name ClaimGuard_Agent
sf apex run --target-org "$claimguard_org" --file scripts/seed-demo.apex
sf org open --target-org "$claimguard_org" --path /lightning/n/ClaimGuard_Console
