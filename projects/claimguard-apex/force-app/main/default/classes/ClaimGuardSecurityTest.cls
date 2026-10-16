@IsTest
private class ClaimGuardSecurityTest {
    @TestSetup static void setup() { ClaimGuardTestFactory.setupUsers(); }

    @IsTest static void privateSharingPreventsCrossAgentReadsAndWrites() {
        Id claimId;
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            claimId = ClaimGuardService.create(ClaimGuardTestFactory.intake('security-private')).claimId;
        }
        System.runAs(ClaimGuardTestFactory.user('CGOther')) {
            System.assertEquals(0, ClaimGuardController.listClaims('All', null).size());
            System.assertEquals(0, ClaimGuardController.getAudit(claimId).size());
            Boolean rejected = false;
            try { ClaimGuardService.transition(claimId, 'New', 'InReview', null); }
            catch (ClaimGuardPolicy.InvalidClaimException error) { rejected = true; }
            System.assert(rejected, 'Another agent must not update an inaccessible claim.');
        }
    }
    @IsTest static void replayCannotLeakAnotherAgentsClaim() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            ClaimGuardService.create(ClaimGuardTestFactory.intake('security-replay'));
        }
        System.runAs(ClaimGuardTestFactory.user('CGOther')) {
            Boolean conflict = false;
            try { ClaimGuardService.create(ClaimGuardTestFactory.intake('security-replay')); }
            catch (ClaimGuardService.ConflictException error) { conflict = true; }
            System.assert(conflict, 'The global unique key must not disclose another owner record ID.');
        }
    }
    @IsTest static void userWithoutObjectPermissionCannotReadClaims() {
        System.runAs(ClaimGuardTestFactory.user('CGBlock')) {
            System.assertEquals(false, Bank_Claim__c.SObjectType.getDescribe().isAccessible(), 'Use a clean minimum-access profile.');
            Boolean denied = false;
            try { ClaimGuardController.listClaims('All', null); }
            catch (QueryException error) { denied = true; }
            System.assert(denied);
        }
    }
    @IsTest static void agentCannotWriteDerivedScoreThroughUserMode() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            System.assertEquals(false, Bank_Claim__c.Risk_Score__c.getDescribe().isUpdateable());
            Id claimId = ClaimGuardService.create(ClaimGuardTestFactory.intake('security-score')).claimId;
            Boolean denied = false;
            try { update as user new Bank_Claim__c(Id = claimId, Risk_Score__c = 99); }
            catch (DmlException error) { denied = true; }
            System.assert(denied);
        }
    }
    @IsTest static void viewerCannotAdvanceEvenAnOwnedClaim() {
        User viewer = ClaimGuardTestFactory.user('CGView');
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('security-viewer');
        claim.OwnerId = viewer.Id;
        insert as system claim;
        System.runAs(viewer) {
            System.assertEquals(1, ClaimGuardController.listClaims('All', null).size());
            Boolean denied = false;
            try { ClaimGuardService.transition(claim.Id, 'New', 'InReview', null); }
            catch (DmlException error) { denied = true; }
            System.assert(denied);
        }
        System.assertEquals('New', [SELECT Status__c FROM Bank_Claim__c WHERE Id = :claim.Id].Status__c);
        System.assertEquals(1, [SELECT COUNT() FROM Claim_Event__c WHERE Claim__c = :claim.Id]);
    }
}
