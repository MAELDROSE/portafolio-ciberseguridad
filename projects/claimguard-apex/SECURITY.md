# Security boundaries

This is a fictional banking operations portfolio project. Only synthetic data is included.

- Public Apex boundaries enforce sharing, CRUD and field permissions using explicit user-mode operations.
- Intake is a strict allowlist DTO with bounded reference tokens, supported currencies and categories, positive amounts, maximum amount, decimal precision and an 8 KiB body limit.
- Reference validation is not a personal-data detector. The UI asks users to use synthetic identifiers; a real integration needs tokenization/data classification upstream.
- The external key has a unique database index. Replays cannot return IDs of records outside the caller's sharing scope.
- Agents can read derived fields but cannot edit their score/deadline/escalation fields. The trigger also restores these fields from stored values for ordinary updates.
- Audit fields are read-only in both provided permission sets. The audit trigger blocks direct insertion, editing and deletion outside the trusted writer. Closed claim resolutions and original intake are immutable.
- The batch and audit writer are intentional system-mode components. Their public methods are callable by trusted Apex, not remotely exposed endpoints.
- Salesforce authentication protects the REST resource. No guest-user access, embedded tokens, passwords or customer portal is configured.
- Query parameters are bound values. There is no client-controlled SOQL concatenation.
- Free-form text is rendered through Lightning components/text interpolation. No manual HTML insertion is used.
- Error responses do not expose database exceptions, stack traces or hidden claim IDs. Salesforce debug output records only an exception type on unexpected intake failures.

The application does not assert regulatory compliance, detect fraud through machine learning, encrypt arbitrary fields, send security alerts or replace an external immutable log. Salesforce administrators can change metadata and therefore remain in the trust boundary.

Negative permissions tests must run against a clean org. Local parser and metadata checks do not prove authorization behavior. Review the actual test run and coverage before deploying beyond a development environment.
