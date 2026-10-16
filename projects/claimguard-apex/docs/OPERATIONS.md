# Operations in a development org

## Escalation

Run `scripts/schedule-escalations.apex` once as an administrator. It registers `ClaimGuard hourly escalation` if an active schedule with that name does not already exist. The cron expression is evaluated in the scheduling user's timezone. An hourly pattern is used rather than a business-calendar schedule.

The job processes chunks of 200 candidate claims. Expired claims are flagged and timestamped, but their investigation status does not change. The hourly frequency means deadline-to-flag delay can approach one hour, with additional Salesforce queue delay. There are no outbound notifications in this version.

Inspect scheduled jobs in Setup → Scheduled Jobs and batch runs in Setup → Apex Jobs. A failed execution chunk rolls back that chunk and is visible through AsyncApexJob errors. Other successfully processed chunks can remain committed. Rerunning the job retries records still unflagged; completed escalations are not duplicated.

An administrator can inspect job counts without printing claim data:

```sql
SELECT Id, Status, JobItemsProcessed, TotalJobItems, NumberOfErrors
FROM AsyncApexJob
WHERE ApexClass.Name = 'ClaimGuardEscalationBatch'
ORDER BY CreatedDate DESC
LIMIT 10
```

Abort the scheduled job through Scheduled Jobs if the demonstration is complete. Records are retained by design; use a disposable scratch org or delete the development org when you want a clean reset. Do not disable retention triggers to clean a shared environment casually.

## Record sharing

Private claims belong to their creator by default. For a two-user demonstration, create records as each user or configure explicit record sharing as an administrator. The Viewer permission set grants read capability, but does not automatically share another user's private records. Metrics and audit queries follow the current user's access.

## Failure handling

- Request-level duplicate/conflict: return 409 without a hidden record ID; retry with the original key and body when appropriate.
- Invalid payload: return 400 or 422; fix input before retrying.
- Missing permissions: return 403; repair intended grants rather than broadening the Apex sharing mode.
- Database lock contention: the transaction can fail and must be retried after refreshing; this version does not implement an automatic client backoff queue.
- Batch errors: inspect Apex Jobs; repair the underlying cause and rerun. There is no automatic email or dead-letter queue in the demo.
- Unexpected intake failures: return a generic 500 and log the exception type. Do not add raw financial data to diagnostic logs.
