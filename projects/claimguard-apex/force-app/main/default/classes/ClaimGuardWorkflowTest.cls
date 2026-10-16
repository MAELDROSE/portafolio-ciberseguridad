@IsTest
private class ClaimGuardWorkflowTest {
    @IsTest static void bulkInsertTriagesTwoHundredWithConstantDml() {
        ClaimGuardClock.testNow = Datetime.newInstanceGmt(2026, 1, 1, 12, 0, 0);
        List<Bank_Claim__c> claims = new List<Bank_Claim__c>();
        for (Integer index = 0; index < 200; index++) {
            Bank_Claim__c claim = ClaimGuardTestFactory.claim('bulk-' + index);
            claim.Category__c = 'Unauthorized';
            claims.add(claim);
        }
        Test.startTest();
        Integer beforeQueries = Limits.getQueries();
        Integer beforeDml = Limits.getDmlStatements();
        insert as system claims;
        Integer usedQueries = Limits.getQueries() - beforeQueries;
        Integer usedDml = Limits.getDmlStatements() - beforeDml;
        Test.stopTest();
        System.assertEquals(0, usedQueries, 'Trigger must not issue SOQL per claim.');
        System.assertEquals(2, usedDml, 'One business insert plus one audit insert.');
        System.assertEquals(200, [SELECT COUNT() FROM Claim_Event__c WHERE Kind__c = 'Created']);
        for (Bank_Claim__c claim : [SELECT Priority__c, Due_At__c FROM Bank_Claim__c]) {
            System.assertEquals('Critical', claim.Priority__c);
            System.assertEquals(ClaimGuardClock.testNow.addHours(4), claim.Due_At__c);
        }
    }
    @IsTest static void validWorkflowHasAtomicAuditAndClosureTimestamp() {
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('workflow-valid');
        insert as system claim;
        claim.Status__c = 'InReview';
        update as system claim;
        claim.Status__c = 'Resolved';
        claim.Resolution__c = 'Synthetic transaction evidence confirms a duplicate charge.';
        update as system claim;
        Bank_Claim__c stored = [SELECT Status__c, Closed_At__c FROM Bank_Claim__c WHERE Id = :claim.Id];
        System.assertEquals('Resolved', stored.Status__c);
        System.assertNotEquals(null, stored.Closed_At__c);
        System.assertEquals(3, [SELECT COUNT() FROM Claim_Event__c WHERE Claim__c = :claim.Id]);
    }
    @IsTest static void invalidUpdateRollsBackWithoutAudit() {
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('workflow-invalid');
        insert as system claim;
        claim.Status__c = 'Resolved';
        claim.Resolution__c = 'Synthetic closure attempt without investigation.';
        Database.SaveResult result = Database.update(claim, false);
        System.assertEquals(false, result.isSuccess());
        System.assertEquals('New', [SELECT Status__c FROM Bank_Claim__c WHERE Id = :claim.Id].Status__c);
        System.assertEquals(1, [SELECT COUNT() FROM Claim_Event__c WHERE Claim__c = :claim.Id]);
    }
    @IsTest static void intakeCannotBeChangedAndDerivedFieldsCannotBeForged() {
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('workflow-immutable');
        insert as system claim;
        claim.Amount__c = 500;
        System.assertEquals(false, Database.update(claim, false).isSuccess());
        Bank_Claim__c forged = new Bank_Claim__c(Id = claim.Id, Risk_Score__c = 99,
            Escalated__c = true, Due_At__c = System.now().addYears(5));
        update as system forged;
        Bank_Claim__c stored = [SELECT Risk_Score__c, Escalated__c, Due_At__c FROM Bank_Claim__c WHERE Id = :claim.Id];
        System.assertEquals(10, stored.Risk_Score__c);
        System.assertEquals(false, stored.Escalated__c);
        System.assert(stored.Due_At__c < System.now().addDays(4));
    }
    @IsTest static void deletionAndAuditForgeryAreBlocked() {
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('workflow-audit');
        insert as system claim;
        System.assertEquals(false, Database.delete(claim, false).isSuccess());
        Claim_Event__c audit = [SELECT Id FROM Claim_Event__c WHERE Claim__c = :claim.Id LIMIT 1];
        audit.Detail__c = 'Forged event';
        System.assertEquals(false, Database.update(audit, false).isSuccess());
        System.assertEquals(false, Database.delete(audit, false).isSuccess());
        System.assertEquals(false, Database.insert(new Claim_Event__c(Claim__c = claim.Id, Kind__c = 'Forged'), false).isSuccess());
    }
    @IsTest static void partialBulkSaveCreatesEventsOnlyForSuccessfulClaims() {
        Bank_Claim__c invalid = ClaimGuardTestFactory.claim('workflow-bad');
        invalid.Amount__c = -1;
        List<Database.SaveResult> results = Database.insert(new List<Bank_Claim__c>{ClaimGuardTestFactory.claim('workflow-good'), invalid}, false);
        System.assertEquals(true, results[0].isSuccess());
        System.assertEquals(false, results[1].isSuccess());
        System.assertEquals(1, [SELECT COUNT() FROM Bank_Claim__c]);
        System.assertEquals(1, [SELECT COUNT() FROM Claim_Event__c]);
    }
}
