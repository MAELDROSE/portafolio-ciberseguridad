/** Deterministic triage rules for a fictional bank; not fraud prediction. */
public inherited sharing class ClaimGuardPolicy {
    public class InvalidClaimException extends Exception {}
    private static final Set<String> CATEGORIES = new Set<String>{
        'Unauthorized', 'DoubleCharge', 'ServiceIssue'
    };
    private static final Set<String> CURRENCIES = new Set<String>{'USD', 'CRC'};
    private static final Map<String, Set<String>> TRANSITIONS = new Map<String, Set<String>>{
        'New' => new Set<String>{'InReview'},
        'InReview' => new Set<String>{'Resolved', 'Rejected'},
        'Resolved' => new Set<String>(),
        'Rejected' => new Set<String>()
    };

    public static void validateIntake(Bank_Claim__c claim) {
        validateRef(claim.External_Key__c, 'Idempotency key');
        validateRef(claim.Customer_Ref__c, 'Customer reference');
        validateRef(claim.Transaction_Ref__c, 'Transaction reference');
        if (claim.Amount__c == null || claim.Amount__c <= 0 || claim.Amount__c > 10000000) {
            throw new InvalidClaimException('Amount must be greater than zero and at most 10000000.');
        }
        if (claim.Amount__c.scale() > 2) {
            throw new InvalidClaimException('Amount supports at most two decimal places.');
        }
        if (!CURRENCIES.contains(claim.Currency_Code__c)) {
            throw new InvalidClaimException('Currency must be USD or CRC.');
        }
        if (!CATEGORIES.contains(claim.Category__c)) {
            throw new InvalidClaimException('Unsupported claim category.');
        }
    }

    private static void validateRef(String value, String label) {
        if (String.isBlank(value) || !Pattern.matches('^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$', value)) {
            throw new InvalidClaimException(label + ' must contain 3-80 safe reference characters.');
        }
    }

    public static Integer score(Bank_Claim__c claim) {
        Integer result = claim.Category__c == 'Unauthorized' ? 70 :
            (claim.Category__c == 'DoubleCharge' ? 30 : 10);
        Decimal threshold = claim.Currency_Code__c == 'CRC' ? 600000 : 1000;
        return result + (claim.Amount__c >= threshold ? 25 : 0);
    }

    public static String priority(Integer value) {
        return value >= 70 ? 'Critical' : (value >= 40 ? 'High' : 'Standard');
    }

    public static Integer slaHours(String priority) {
        return priority == 'Critical' ? 4 : (priority == 'High' ? 24 : 72);
    }

    public static Boolean isClosed(String status) {
        return status == 'Resolved' || status == 'Rejected';
    }

    public static void validateTransition(String fromStatus, String toStatus, String resolution) {
        if (fromStatus == toStatus) {
            return;
        }
        if (!TRANSITIONS.containsKey(fromStatus) || !TRANSITIONS.get(fromStatus).contains(toStatus)) {
            throw new InvalidClaimException('Invalid status transition: ' + fromStatus + ' -> ' + toStatus + '.');
        }
        if (isClosed(toStatus) && (String.isBlank(resolution) || resolution.trim().length() < 20)) {
            throw new InvalidClaimException('Closing a claim requires a resolution of at least 20 characters.');
        }
    }
}
