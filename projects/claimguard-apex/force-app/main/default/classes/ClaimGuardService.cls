public with sharing class ClaimGuardService {
    public class ConflictException extends Exception {}

    public class Intake {
        public String externalKey;
        public String customerRef;
        public String transactionRef;
        public Decimal amount;
        public String currencyCode;
        public String category;
    }

    public class IntakeResult {
        public Id claimId;
        public Boolean duplicate;
        public IntakeResult(Id claimId, Boolean duplicate) {
            this.claimId = claimId;
            this.duplicate = duplicate;
        }
    }

    public static IntakeResult create(Intake input) {
        if (input == null) {
            throw new ClaimGuardPolicy.InvalidClaimException('A JSON object is required.');
        }
        Bank_Claim__c candidate = new Bank_Claim__c(
            External_Key__c = clean(input.externalKey).toLowerCase(),
            Customer_Ref__c = clean(input.customerRef),
            Transaction_Ref__c = clean(input.transactionRef),
            Amount__c = input.amount,
            Currency_Code__c = clean(input.currencyCode).toUpperCase(),
            Category__c = clean(input.category)
        );
        ClaimGuardPolicy.validateIntake(candidate);
        String key = candidate.External_Key__c;
        List<Bank_Claim__c> existing = [
            SELECT Id, Customer_Ref__c, Transaction_Ref__c, Amount__c, Currency_Code__c, Category__c
            FROM Bank_Claim__c WHERE External_Key__c = :key WITH USER_MODE LIMIT 1
        ];
        if (!existing.isEmpty()) {
            Bank_Claim__c prior = existing[0];
            if (!prior.Customer_Ref__c.equals(candidate.Customer_Ref__c) ||
                !prior.Transaction_Ref__c.equals(candidate.Transaction_Ref__c) ||
                prior.Amount__c != candidate.Amount__c ||
                prior.Currency_Code__c != candidate.Currency_Code__c ||
                prior.Category__c != candidate.Category__c) {
                throw new ConflictException('Idempotency key cannot be reused for a different request.');
            }
            return new IntakeResult(prior.Id, true);
        }
        try {
            insert as user candidate;
        } catch (DmlException error) {
            if (error.getDmlType(0) == StatusCode.DUPLICATE_VALUE) {
                // Unique database index covers concurrent requests and invisible records.
                // Never return the ID of a record outside the caller's sharing scope.
                throw new ConflictException('Idempotency key is unavailable. Retry an identical request.');
            }
            throw error;
        }
        return new IntakeResult(candidate.Id, false);
    }

    public static void transition(Id claimId, String expectedStatus, String nextStatus, String resolution) {
        if (claimId == null || claimId.getSObjectType() != Bank_Claim__c.SObjectType) {
            throw new ClaimGuardPolicy.InvalidClaimException('A claim ID is required.');
        }
        List<Bank_Claim__c> records = [
            SELECT Id, Status__c, Resolution__c FROM Bank_Claim__c
            WHERE Id = :claimId WITH USER_MODE LIMIT 1 FOR UPDATE
        ];
        if (records.isEmpty()) {
            throw new ClaimGuardPolicy.InvalidClaimException('Claim is unavailable.');
        }
        Bank_Claim__c prior = records[0];
        if (String.isBlank(expectedStatus) || prior.Status__c != expectedStatus) {
            throw new ConflictException('Claim changed. Refresh the console before retrying.');
        }
        if (nextStatus == prior.Status__c) {
            return;
        }
        if (resolution != null && resolution.length() > 2000) {
            throw new ClaimGuardPolicy.InvalidClaimException('Resolution supports at most 2000 characters.');
        }
        ClaimGuardPolicy.validateTransition(prior.Status__c, nextStatus, resolution);
        // Sparse update avoids inadvertently writing read-only fields from a query.
        Bank_Claim__c change = new Bank_Claim__c(Id = claimId, Status__c = nextStatus);
        if (ClaimGuardPolicy.isClosed(nextStatus)) {
            change.Resolution__c = resolution.trim();
        }
        update as user change;
    }

    private static String clean(String value) {
        return value == null ? '' : value.trim();
    }
}
