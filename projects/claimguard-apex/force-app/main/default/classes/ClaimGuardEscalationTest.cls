@IsTest
private class ClaimGuardEscalationTest {
    @IsTest static void batchEscalatesOnlyOverdueOpenClaims() {
        ClaimGuardClock.testNow = System.now().addDays(-5);
        List<Bank_Claim__c> old = new List<Bank_Claim__c>{ClaimGuardTestFactory.claim('batch-old-1'), ClaimGuardTestFactory.claim('batch-old-2'), ClaimGuardTestFactory.claim('batch-closed')};
        insert as system old;
        old[2].Status__c = 'InReview';
        update as system old[2];
        old[2].Status__c = 'Resolved';
        old[2].Resolution__c = 'Synthetic dispute resolved before escalation.';
        update as system old[2];
        ClaimGuardClock.testNow = null;
        Bank_Claim__c fresh = ClaimGuardTestFactory.claim('batch-fresh');
        insert as system fresh;
        Test.startTest();
        Id jobId = Database.executeBatch(new ClaimGuardEscalationBatch(), 200);
        Test.stopTest();
        AsyncApexJob job = [SELECT NumberOfErrors FROM AsyncApexJob WHERE Id = :jobId];
        System.assertEquals(0, job.NumberOfErrors);
        System.assertEquals(2, [SELECT COUNT() FROM Bank_Claim__c WHERE Escalated__c = true]);
        System.assertEquals(2, [SELECT COUNT() FROM Claim_Event__c WHERE Kind__c = 'Escalated']);
    }
    @IsTest static void repeatedAndStaleScopesDoNotDuplicateEvents() {
        ClaimGuardClock.testNow = System.now().addDays(-5);
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('batch-replay');
        insert as system claim;
        ClaimGuardClock.testNow = null;
        ClaimGuardEscalationBatch batch = new ClaimGuardEscalationBatch();
        batch.execute((Database.BatchableContext) null, new List<Bank_Claim__c>{claim});
        batch.execute((Database.BatchableContext) null, new List<Bank_Claim__c>{claim});
        System.assertEquals(1, [SELECT COUNT() FROM Claim_Event__c WHERE Claim__c = :claim.Id AND Kind__c = 'Escalated']);
        System.assertEquals(false, ClaimGuardEscalationBatch.isEscalating());
    }
    @IsTest static void schedulerCanBeRegistered() {
        Test.startTest();
        String jobId = System.schedule('ClaimGuard test hourly', '0 0 * * * ?', new ClaimGuardEscalationBatch());
        CronTrigger schedule = [SELECT CronExpression FROM CronTrigger WHERE Id = :jobId];
        System.assertEquals('0 0 * * * ?', schedule.CronExpression);
        Test.stopTest();
    }
}
