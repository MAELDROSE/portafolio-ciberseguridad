/** Privileged maintenance, scheduled by an administrator; no public UI/API entry. */
public without sharing class ClaimGuardEscalationBatch implements Database.Batchable<SObject>, Schedulable {
    private static Boolean escalating = false;

    public static Boolean isEscalating() {
        return escalating;
    }

    public Database.QueryLocator start(Database.BatchableContext context) {
        Datetime timestamp = ClaimGuardClock.now();
        return Database.getQueryLocator([
            SELECT Id FROM Bank_Claim__c
            WHERE Status__c IN ('New', 'InReview') AND Escalated__c = false AND Due_At__c <= :timestamp
            WITH SYSTEM_MODE
        ]);
    }

    public void execute(Database.BatchableContext context, List<Bank_Claim__c> scope) {
        Set<Id> ids = new Map<Id, Bank_Claim__c>(scope).keySet();
        Datetime timestamp = ClaimGuardClock.now();
        // Recheck under a row lock: a claim might have been closed since start().
        List<Bank_Claim__c> current = [
            SELECT Id, Status__c, Escalated__c, Due_At__c FROM Bank_Claim__c
            WHERE Id IN :ids WITH SYSTEM_MODE FOR UPDATE
        ];
        List<Bank_Claim__c> changes = new List<Bank_Claim__c>();
        for (Bank_Claim__c claim : current) {
            if (!ClaimGuardPolicy.isClosed(claim.Status__c) && !claim.Escalated__c && claim.Due_At__c <= timestamp) {
                changes.add(new Bank_Claim__c(Id = claim.Id, Escalated__c = true));
            }
        }
        if (!changes.isEmpty()) {
            escalating = true;
            try {
                // Atomic with trigger-generated events. Failed chunks surface in AsyncApexJob.
                update as system changes;
            } finally {
                escalating = false;
            }
        }
    }

    public void finish(Database.BatchableContext context) {
        // Inspect NumberOfErrors and JobItemsProcessed on AsyncApexJob (see operations guide).
    }

    public void execute(SchedulableContext context) {
        Database.executeBatch(new ClaimGuardEscalationBatch(), 200);
    }
}
