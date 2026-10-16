# Validation record for this build

## Completed locally

| Check | Actual result |
| --- | --- |
| Apex and embedded SOQL grammar, using @apexdevtools/apex-parser 5.3.0 | 19 source files parsed; 0 syntax errors |
| Lightning Web Components, using @lwc/compiler 9.0.0 | JavaScript, HTML and CSS compiled; 0 errors |
| Salesforce metadata XML structure | 45 XML files parsed with the Salesforce namespace |
| Local metadata references | Class, custom field and permission references resolved by the included structural validator |
| Package and API JSON | Parsed without JSON syntax errors |
| OpenAPI 3.0.3 contract, using Redocly CLI minimal rules | Valid; CLI exited successfully |
| Postman response-test scripts | 3 scripts parsed with Node's JavaScript parser; no HTTP requests executed |
| Setup shell script | Passed bash syntax checking |
| Node version used for the local build | v24.19.0 |

These checks establish source grammar, LWC compilation and local structural consistency. They do not establish Apex semantic correctness or runtime behavior in Salesforce. No Salesforce org was authenticated in the build environment, so no deployment or Apex test execution is claimed.

## Authored Apex tests: 30 methods

| Class | Methods | Intended behavioral coverage |
| --- | ---: | --- |
| ClaimGuardPolicyTest | 5 | Priority and SLA, USD/CRC threshold boundaries, amount precision, invalid references, state graph |
| ClaimGuardWorkflowTest | 6 | 200-record bulk insert, closure and audit, invalid-update rollback, immutable inputs, audit forgery/deletion, partial saves |
| ClaimGuardServiceTest | 5 | Identical replay, changed payload conflict, stale status, console summary/filter/audit, null intake |
| ClaimGuardSecurityTest | 5 | Private sharing, hidden-key replay, denied object access, protected field access, read-only viewer |
| ClaimGuardRestTest | 6 | 201/200 replay, malformed JSON/unknown fields, content type/body bound, business validation, 409, 403 without leaked data |
| ClaimGuardEscalationTest | 3 | Overdue/open selection, repeated scopes without duplicate events, schedule registration |

The test factory is support code and contains no test methods. The two anonymous Apex scripts seed synthetic records and register the optional schedule.

## Pending checks in Salesforce

- Actual metadata deployment and Apex semantic compilation.
- All 30 test methods and any other local-org tests.
- Code coverage by class and aggregate; no percentage is asserted yet.
- Runtime assertions for governor usage and permission behavior.
- Browser verification of the console in an authenticated Salesforce session.
- Real HTTP execution of the Postman sequence.
- Background schedule execution, queue behavior and operational measurements.

## Reproduce the completed source checks

```bash
npm ci
npm run check
bash -n scripts/setup-demo.sh
```

The Redocly contract check can be repeated with `npx --yes @redocly/cli lint api/openapi.json --extends=minimal`; its CLI is an optional external checker, not a runtime dependency. Reproducible source dependencies are pinned in package-lock.json.

## Record observed org results after running

| Item | Observed result |
| --- | --- |
| Development org / alias | Pending |
| Deployment job ID | Pending |
| Apex test-run ID | Pending |
| Passed / failed methods | Pending |
| Actual code coverage | Pending |
| Actual 200-record DML / SOQL counts | Pending |
| Console and REST verification | Pending |

Do not replace pending values with estimates or present test assertions as observed production impact.
