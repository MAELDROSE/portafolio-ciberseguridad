@IsTest
private class ClaimGuardPolicyTest {
    @IsTest static void unauthorizedHasFourHourSla() {
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('policy-critical');
        claim.Category__c = 'Unauthorized';
        ClaimGuardPolicy.validateIntake(claim);
        System.assertEquals(70, ClaimGuardPolicy.score(claim));
        System.assertEquals('Critical', ClaimGuardPolicy.priority(70));
        System.assertEquals(4, ClaimGuardPolicy.slaHours('Critical'));
    }
    @IsTest static void thresholdsRespectCurrency() {
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('policy-threshold');
        claim.Category__c = 'DoubleCharge';
        claim.Amount__c = 999.99;
        System.assertEquals(30, ClaimGuardPolicy.score(claim));
        claim.Amount__c = 1000;
        System.assertEquals(55, ClaimGuardPolicy.score(claim));
        claim.Currency_Code__c = 'CRC';
        claim.Amount__c = 599999.99;
        System.assertEquals(30, ClaimGuardPolicy.score(claim));
        claim.Amount__c = 600000;
        System.assertEquals(55, ClaimGuardPolicy.score(claim));
        System.assertEquals('High', ClaimGuardPolicy.priority(55));
        System.assertEquals(24, ClaimGuardPolicy.slaHours('High'));
        System.assertEquals(72, ClaimGuardPolicy.slaHours('Standard'));
    }
    @IsTest static void rejectsInvalidAmountsAndDecimals() {
        for (Decimal amount : new List<Decimal>{0, -1, 10000001, 1.001}) {
            Bank_Claim__c claim = ClaimGuardTestFactory.claim('policy-amount');
            claim.Amount__c = amount;
            Boolean rejected = false;
            try { ClaimGuardPolicy.validateIntake(claim); }
            catch (ClaimGuardPolicy.InvalidClaimException error) { rejected = true; }
            System.assert(rejected, 'Invalid amount must be rejected: ' + amount);
        }
    }
    @IsTest static void rejectsUnsafeReferencesAndUnsupportedValues() {
        Bank_Claim__c claim = ClaimGuardTestFactory.claim('policy-reference');
        claim.Customer_Ref__c = '<script>unsafe</script>';
        Boolean rejected = false;
        try { ClaimGuardPolicy.validateIntake(claim); }
        catch (ClaimGuardPolicy.InvalidClaimException error) { rejected = true; }
        System.assert(rejected);
        claim.Customer_Ref__c = 'demo-customer-001';
        claim.Currency_Code__c = 'EUR';
        rejected = false;
        try { ClaimGuardPolicy.validateIntake(claim); }
        catch (ClaimGuardPolicy.InvalidClaimException error) { rejected = true; }
        System.assert(rejected);
        claim.Currency_Code__c = 'USD';
        claim.Category__c = 'Unknown';
        rejected = false;
        try { ClaimGuardPolicy.validateIntake(claim); }
        catch (ClaimGuardPolicy.InvalidClaimException error) { rejected = true; }
        System.assert(rejected);
    }
    @IsTest static void enforcesStateMachineAndResolution() {
        ClaimGuardPolicy.validateTransition('New', 'InReview', null);
        ClaimGuardPolicy.validateTransition('InReview', 'Resolved', 'Synthetic evidence supports the requested refund.');
        for (String invalidNext : new List<String>{'Resolved', 'Rejected', 'Unknown'}) {
            Boolean rejected = false;
            try { ClaimGuardPolicy.validateTransition('New', invalidNext, 'A long enough synthetic resolution.'); }
            catch (ClaimGuardPolicy.InvalidClaimException error) { rejected = true; }
            System.assert(rejected);
        }
        Boolean shortRejected = false;
        try { ClaimGuardPolicy.validateTransition('InReview', 'Rejected', 'Too short'); }
        catch (ClaimGuardPolicy.InvalidClaimException error) { shortRejected = true; }
        System.assert(shortRejected);
    }
}
