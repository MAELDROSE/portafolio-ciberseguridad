// Administrator only. One hourly schedule per org. No email is sent.
List<CronTrigger> existing = [SELECT Id FROM CronTrigger WHERE CronJobDetail.Name = 'ClaimGuard hourly escalation' AND State != 'DELETED'];
if (existing.isEmpty()) {
    System.schedule('ClaimGuard hourly escalation', '0 0 * * * ?', new ClaimGuardEscalationBatch());
    System.debug(LoggingLevel.INFO, 'ClaimGuard hourly escalation scheduled.');
} else {
    System.debug(LoggingLevel.INFO, 'Schedule already exists; no duplicate created.');
}
