public with sharing class ClaimGuardController {
    @AuraEnabled(cacheable=true)
    public static List<Bank_Claim__c> listClaims(String statusFilter, String searchTerm) {
        String status = String.isBlank(statusFilter) || statusFilter == 'All' ? null : statusFilter;
        if (status != null && !new Set<String>{'New', 'InReview', 'Resolved', 'Rejected'}.contains(status)) {
            throw new AuraHandledException('Unsupported status filter.');
        }
        Set<String> statuses = status == null ?
            new Set<String>{'New', 'InReview', 'Resolved', 'Rejected'} : new Set<String>{status};
        String term = String.isBlank(searchTerm) ? null : searchTerm.trim();
        if (term != null && term.length() > 80) {
            throw new AuraHandledException('Search supports at most 80 characters.');
        }
        String pattern = term == null ? '%' : '%' + term + '%';
        return [
            SELECT Id, Name, External_Key__c, Customer_Ref__c, Transaction_Ref__c,
                Amount__c, Currency_Code__c, Category__c, Status__c, Priority__c,
                Risk_Score__c, Received_At__c, Due_At__c, Escalated__c, Resolution__c
            FROM Bank_Claim__c
            WHERE Status__c IN :statuses
                AND (Name LIKE :pattern OR External_Key__c LIKE :pattern OR Transaction_Ref__c LIKE :pattern)
            WITH USER_MODE ORDER BY Due_At__c ASC, Id ASC LIMIT 200
        ];
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getSummary() {
        Datetime timestamp = ClaimGuardClock.now();
        Integer open = 0;
        Integer critical = 0;
        Integer escalated = 0;
        for (AggregateResult groupRow : [
            SELECT Priority__c, Escalated__c, COUNT(Id) total
            FROM Bank_Claim__c WHERE Status__c IN ('New', 'InReview')
            WITH USER_MODE GROUP BY Priority__c, Escalated__c
        ]) {
            Integer count = (Integer) groupRow.get('total');
            open += count;
            if ((String) groupRow.get('Priority__c') == 'Critical') {
                critical += count;
            }
            if ((Boolean) groupRow.get('Escalated__c')) {
                escalated += count;
            }
        }
        Integer overdue = [
            SELECT COUNT() FROM Bank_Claim__c
            WHERE Status__c IN ('New', 'InReview') AND Due_At__c <= :timestamp WITH USER_MODE
        ];
        return new Map<String, Integer>{'open' => open, 'critical' => critical, 'overdue' => overdue, 'escalated' => escalated};
    }

    @AuraEnabled(cacheable=true)
    public static List<Claim_Event__c> getAudit(Id claimId) {
        return [
            SELECT Id, Kind__c, Status_From__c, Status_To__c, Detail__c, CreatedDate, CreatedBy.Name
            FROM Claim_Event__c WHERE Claim__c = :claimId
            WITH USER_MODE ORDER BY CreatedDate ASC, Id ASC LIMIT 100
        ];
    }

    @AuraEnabled
    public static void transitionClaim(Id claimId, String expectedStatus, String nextStatus, String resolution) {
        try {
            ClaimGuardService.transition(claimId, expectedStatus, nextStatus, resolution);
        } catch (ClaimGuardPolicy.InvalidClaimException error) {
            throw new AuraHandledException(error.getMessage());
        } catch (ClaimGuardService.ConflictException error) {
            throw new AuraHandledException(error.getMessage());
        } catch (Exception error) {
            throw new AuraHandledException('Claim could not be updated. Check access and refresh the console.');
        }
    }
}
