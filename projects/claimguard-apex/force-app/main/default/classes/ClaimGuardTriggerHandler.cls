public inherited sharing class ClaimGuardTriggerHandler {
    public static void beforeSave(List<Bank_Claim__c> records, Map<Id, Bank_Claim__c> oldMap) {
        Datetime timestamp = ClaimGuardClock.now();
        for (Bank_Claim__c claim : records) {
            try {
                if (oldMap == null) {
                    ClaimGuardPolicy.validateIntake(claim);
                    if (claim.Status__c != null && claim.Status__c != 'New') {
                        throw new ClaimGuardPolicy.InvalidClaimException('Claims must start in New status.');
                    }
                    claim.Status__c = 'New';
                    claim.Resolution__c = null;
                    Integer score = ClaimGuardPolicy.score(claim);
                    claim.Risk_Score__c = score;
                    claim.Priority__c = ClaimGuardPolicy.priority(score);
                    claim.Received_At__c = timestamp;
                    claim.Due_At__c = timestamp.addHours(ClaimGuardPolicy.slaHours(claim.Priority__c));
                    claim.Escalated__c = false;
                    claim.Escalated_At__c = null;
                    claim.Closed_At__c = null;
                } else {
                    prepareUpdate(claim, oldMap.get(claim.Id), timestamp);
                }
            } catch (ClaimGuardPolicy.InvalidClaimException error) {
                claim.addError(error.getMessage());
            }
        }
    }

    private static void prepareUpdate(Bank_Claim__c claim, Bank_Claim__c previous, Datetime timestamp) {
        if (!previous.External_Key__c.equals(claim.External_Key__c) ||
            !previous.Customer_Ref__c.equals(claim.Customer_Ref__c) ||
            !previous.Transaction_Ref__c.equals(claim.Transaction_Ref__c) ||
            claim.Amount__c != previous.Amount__c ||
            claim.Currency_Code__c != previous.Currency_Code__c ||
            claim.Category__c != previous.Category__c) {
            throw new ClaimGuardPolicy.InvalidClaimException('Intake fields are immutable. Submit a new claim for a different transaction.');
        }
        if (ClaimGuardPolicy.isClosed(previous.Status__c) && !previous.Resolution__c.equals(claim.Resolution__c)) {
            throw new ClaimGuardPolicy.InvalidClaimException('Closed claim resolutions are immutable.');
        }
        ClaimGuardPolicy.validateTransition(previous.Status__c, claim.Status__c, claim.Resolution__c);
        claim.Priority__c = previous.Priority__c;
        claim.Risk_Score__c = previous.Risk_Score__c;
        claim.Received_At__c = previous.Received_At__c;
        claim.Due_At__c = previous.Due_At__c;
        claim.Closed_At__c = previous.Closed_At__c;
        if (claim.Status__c != previous.Status__c && ClaimGuardPolicy.isClosed(claim.Status__c)) {
            claim.Resolution__c = claim.Resolution__c.trim();
            claim.Closed_At__c = timestamp;
        }
        if (ClaimGuardEscalationBatch.isEscalating() && !previous.Escalated__c &&
            !ClaimGuardPolicy.isClosed(claim.Status__c) && claim.Due_At__c <= timestamp) {
            claim.Escalated__c = true;
            claim.Escalated_At__c = timestamp;
        } else {
            claim.Escalated__c = previous.Escalated__c;
            claim.Escalated_At__c = previous.Escalated_At__c;
        }
    }

    public static void afterSave(List<Bank_Claim__c> records, Map<Id, Bank_Claim__c> oldMap) {
        List<Claim_Event__c> events = new List<Claim_Event__c>();
        for (Bank_Claim__c claim : records) {
            Bank_Claim__c previous = oldMap == null ? null : oldMap.get(claim.Id);
            if (previous == null) {
                events.add(eventFor(claim, null, 'Created', 'Claim accepted and triaged.'));
            } else {
                if (claim.Status__c != previous.Status__c) {
                    events.add(eventFor(claim, previous.Status__c, 'StatusChanged', 'Claim workflow advanced.'));
                }
                if (claim.Escalated__c && !previous.Escalated__c) {
                    events.add(eventFor(claim, previous.Status__c, 'Escalated', 'Elapsed-hour SLA expired while claim remained open.'));
                }
            }
        }
        ClaimGuardAudit.append(events);
    }

    private static Claim_Event__c eventFor(Bank_Claim__c claim, String fromStatus, String kind, String detail) {
        return new Claim_Event__c(Claim__c = claim.Id, Kind__c = kind,
            Status_From__c = fromStatus, Status_To__c = claim.Status__c, Detail__c = detail);
    }
}
