# Installation and first run

## 1. Get the required environment

Install the [official Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli). Create a [Salesforce Developer Edition](https://developer.salesforce.com/signup) if you do not already have a development org. Use a dedicated org so existing automation and profiles do not affect the test assumptions. Do not use a production banking org.

Install Node.js 22+ and Python 3.10+. From the project root, run `npm ci` and `npm run check`.

## 2. Authenticate and deploy

```bash
sf org login web --alias claimguard
sf project deploy start --target-org claimguard --source-dir force-app --test-level RunLocalTests --wait 20
sf org assign permset --target-org claimguard --name ClaimGuard_Agent
sf apex run --target-org claimguard --file scripts/seed-demo.apex
sf org open --target-org claimguard --path /lightning/n/ClaimGuard_Console
```

The shell helper runs the same sequence and local checks. On Windows, run these individual CLI commands or use WSL/Git Bash for the shell script.

If the console tab is not visible in the App Launcher, search for ClaimGuard or use the explicit Lightning path above. The component can also be placed on an App Page through Lightning App Builder.

The 12 synthetic examples are inserted only when their fixed external keys are absent in the current user's record scope. Run the seed repeatedly as the same demo user. If another owner already holds a key, the unique constraint correctly rejects it instead of exposing that owner's record.

## 3. Run and record Apex tests

```bash
sf apex run test --target-org claimguard --test-level RunLocalTests --code-coverage --result-format human --wait 20
```

Keep the returned test-run ID and actual coverage output in your private validation notes. Update `docs/VALIDATION.md` with the real result. Salesforce deployment validates Apex semantics and metadata schema; the local parser does not.

The test factory creates users with a non-admin Salesforce-license profile, chosen from profiles without View All Data or Modify All Data. It grants the included permission sets only to the agent, peer agent and viewer. The blocked user receives no custom-object permission. These assumptions are intended for a clean development org; inherited/custom profile grants in another org can invalidate negative security tests.

## 4. Optional scheduled escalation

```bash
sf apex run --target-org claimguard --file scripts/schedule-escalations.apex
```

This creates one hourly schedule. It flags overdue claims and writes audit events; it does not send email, issue a refund or move money. The seed data uses the real current time. To demonstrate a past deadline without waiting, run `ClaimGuardEscalationTest`; the test-only clock is reset before asynchronous execution and only synthetic records are used.

## 5. REST demonstration

Import `api/claimguard.postman_collection.json` into Postman. Set `instanceUrl` to your Salesforce instance URL and `accessToken` to a valid token in your private local environment. The collection contains no token. Use a user with the ClaimGuard Agent permission set and API access.

Run Create, Replay and Conflict in order. Create accepts 201 or 200 so the collection can be rerun. The Replay test verifies that the ID matches the previous response; Conflict changes the amount while keeping the key.

Keep OAuth tokens, SFDX auth URLs and `.sf/` out of Git. Do not paste them into README files, screenshots or interview material.

## 6. CI

The normal GitHub workflow runs parser, LWC compiler and structural metadata checks without Salesforce credentials. It does not claim Apex execution.

An optional manually triggered workflow validates a deployment against a dedicated development org. Configure a GitHub environment named `salesforce-demo` and a secret `SFDX_AUTH_URL` in that environment. The auth URL grants access to its org; use a dedicated least-privilege integration/development account and protect that environment. No secrets are exposed to pull-request workflows. For local use, interactive web login is sufficient; no GitHub secret is needed.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| Permission set or profile lookup fails in tests | Use a clean Developer Edition org with Salesforce user profiles; inspect the deployment error |
| User-mode query fails | Check object, field and record access, not just Apex class access |
| UI works but POST is denied | Verify OAuth API access, Apex class access and ClaimGuard Agent assignment |
| Test coverage below the required threshold | Read uncovered paths, add behavioral tests and rerun; do not remove the validation gate |
| 409 while creating a claim | Reuse the original payload with the same key, or choose a new key for a new request |
| Closed record cannot be edited | This is intentional; intake, closed resolution and workflow invariants apply to native forms too |
| Escalation does not happen immediately at the deadline | Check schedule, AsyncApexJob errors and queue delay; the schedule runs hourly |
