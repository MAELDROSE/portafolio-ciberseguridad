@IsTest
private class ClaimGuardServiceTest {
    @TestSetup static void setup() { ClaimGuardTestFactory.setupUsers(); }

    @IsTest static void identicalRequestsReplayTheSameRecord() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            ClaimGuardService.Intake input = ClaimGuardTestFactory.intake('service-replay');
            ClaimGuardService.IntakeResult first = ClaimGuardService.create(input);
            input.externalKey = ' SERVICE-REPLAY ';
            ClaimGuardService.IntakeResult second = ClaimGuardService.create(input);
            System.assertEquals(first.claimId, second.claimId);
            System.assertEquals(false, first.duplicate);
            System.assertEquals(true, second.duplicate);
            System.assertEquals(1, [SELECT COUNT() FROM Bank_Claim__c]);
            System.assertEquals(1, [SELECT COUNT() FROM Claim_Event__c]);
        }
    }
    @IsTest static void changingPayloadForTheSameKeyIsAConflict() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            ClaimGuardService.Intake input = ClaimGuardTestFactory.intake('service-conflict');
            ClaimGuardService.create(input);
            input.amount = 400;
            Boolean conflict = false;
            try { ClaimGuardService.create(input); }
            catch (ClaimGuardService.ConflictException error) { conflict = true; }
            System.assert(conflict);
            System.assertEquals(1, [SELECT COUNT() FROM Bank_Claim__c]);
        }
    }
    @IsTest static void staleStatusCannotOverwriteAnotherDecision() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            Id claimId = ClaimGuardService.create(ClaimGuardTestFactory.intake('service-stale')).claimId;
            ClaimGuardService.transition(claimId, 'New', 'InReview', null);
            Boolean conflict = false;
            try { ClaimGuardService.transition(claimId, 'New', 'Resolved', 'Synthetic closure based on outdated console state.'); }
            catch (ClaimGuardService.ConflictException error) { conflict = true; }
            System.assert(conflict);
            System.assertEquals('InReview', [SELECT Status__c FROM Bank_Claim__c WHERE Id = :claimId].Status__c);
        }
    }
    @IsTest static void controllerReadsSummaryFiltersAndAudit() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            Id claimId = ClaimGuardService.create(ClaimGuardTestFactory.intake('service-console')).claimId;
            System.assertEquals(1, ClaimGuardController.listClaims('New', 'service-console').size());
            System.assertEquals(0, ClaimGuardController.listClaims('Resolved', null).size());
            System.assertEquals(1, ClaimGuardController.getSummary().get('open'));
            System.assertEquals(1, ClaimGuardController.getAudit(claimId).size());
            ClaimGuardController.transitionClaim(claimId, 'New', 'InReview', null);
            System.assertEquals(2, ClaimGuardController.getAudit(claimId).size());
        }
    }
    @IsTest static void nullIntakeIsRejected() {
        Boolean rejected = false;
        try { ClaimGuardService.create(null); }
        catch (ClaimGuardPolicy.InvalidClaimException error) { rejected = true; }
        System.assert(rejected);
    }
}
