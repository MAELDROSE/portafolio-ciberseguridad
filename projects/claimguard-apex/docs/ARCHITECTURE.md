# Architecture and decisions

## Data model

| Entity | Purpose | Access |
| --- | --- | --- |
| Bank_Claim__c | Immutable intake, priority, elapsed-hour deadline, investigation status and final resolution | Organization-wide default Private; owner/explicit sharing rules govern access |
| Claim_Event__c | Created, StatusChanged and Escalated events | Master-detail child; access controlled by the parent |

The claim external key has a case-insensitive unique database index and is an external ID. The events use Salesforce-created timestamps and actor identity. The maintenance actor is the scheduling/running user, not the original claim reporter. Audit detail is templated; it does not copy request payloads or free-form resolutions.

## Boundaries

`ClaimGuardService` and `ClaimGuardController` declare `with sharing` and use explicit `WITH USER_MODE`, `insert as user` and `update as user`. This deliberately enforces record access plus object and field permissions for the public application boundaries even though the package is pinned to API 62.0.

`ClaimGuardAudit` is a privileged, non-remote writer. It inserts a collection of child events in system mode, because agents have no create/update/delete grant on audit records. The event trigger accepts writes only while that writer is active. Its flag is private, synchronous and reset in a finally block.

`ClaimGuardEscalationBatch` is an administrator-scheduled, system-mode maintenance component. It must see all owners' expired claims. A private flag allows the claim trigger to set derived escalation fields only during maintenance. There is no Aura, REST or invocable method to trigger this privileged job from the public application. An administrator can register it or run anonymous Apex in a development org.

System administrators and deployed Apex ultimately control the org. This is application-level append-only history, not a tamper-proof external ledger. The parent deletion guard also prevents parent-driven cascade deletion through normal application DML.

## Atomicity and bulk limits

The claim mutation and the generated audit insert are one transaction. Audit insertion uses all-or-nothing DML so a failed audit prevents the associated mutation from committing. The handler builds event collections outside DML loops. Native partial-save operations are covered by a behavioral test that verifies only successful parent records retain events.

The 200-record insert test is designed to assert zero SOQL statements in the trigger path and two DML statements in a clean org: one claim insert and one event insert. No runtime performance result or production throughput is implied until Salesforce executes that test.

## Idempotency

The service validates a narrowly typed DTO and looks up the caller-visible external key. An identical normalized request returns that record ID. A changed payload returns conflict. The unique index closes the race where two requests both see no record before inserting. A collision at insert returns generic 409; retrying after the first request commits can return the existing record.

A duplicate key belonging to another agent is invisible to user-mode queries. The unique index still rejects insertion, but the response provides neither that claim's ID nor its payload. The global key namespace can reveal that a key is unavailable; callers should use high-entropy request IDs in a real integration.

This is request idempotency, not fuzzy or cross-key transaction deduplication. No claim is made that distinct customerRef/transactionRef requests are automatically matched.

## Concurrency

Investigation transitions lock the record, compare the client's expected status against the current database status, then update a sparse record in user mode. The state graph is monotonic and closed claims cannot be reopened, so an intervening transition cannot be hidden by cycling back to the original status.

The batch query locates candidates. Each execution queries its scope again with row locks and rechecks status, deadline and existing escalation. This prevents a stale scope from escalating an already resolved claim or adding a second escalation event.

## Scope choices

Custom objects keep the demo installable without assuming an existing bank's Service Cloud Case model. A real project would evaluate standard Case/Entitlement functionality before retaining custom entities. The tradeoff is deliberate: a portable portfolio package versus leveraging an organization's established service model.

Policy thresholds are pure Apex constants so rules are easy to read and test. Approved configurable policies, effective dates, holiday calendars and workload-aware assignment are future work. The application has no money movement or adjudication engine.

The console limits the queue to 200 matching rows, sorted by earliest deadline and ID. Summary counts cover all accessible open records and ignore table filters. The audit panel limits events to 100; production retention/export and paginated history would need an explicit design.

## Official references

- [Apex for Java developers](https://developer.salesforce.com/blogs/2022/09/an-introduction-to-apex-for-java-developers)
- [Securing Apex used by Lightning Web Components](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html)
- [User-mode database operations](https://developer.salesforce.com/blogs/2023/05/write-simplified-and-secure-apex-with-spring-23-updates)
- [Apex Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/)

The vacancy screenshot says “APEX programming language,” but does not name Salesforce. Salesforce Apex was chosen as a stated assumption; Oracle APEX is a different application platform. Confirm the employer's stack before claiming this project satisfies its specific technology requirement.
