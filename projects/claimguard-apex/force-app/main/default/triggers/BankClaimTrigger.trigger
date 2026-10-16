trigger BankClaimTrigger on Bank_Claim__c (before insert, before update, after insert, after update, before delete) {
    if (Trigger.isDelete) {
        for (Bank_Claim__c claim : Trigger.old) {
            claim.addError('ClaimGuard retains claims and their audit history. Deletion is disabled.');
        }
    } else if (Trigger.isBefore) {
        ClaimGuardTriggerHandler.beforeSave(Trigger.new, Trigger.isInsert ? null : Trigger.oldMap);
    } else {
        ClaimGuardTriggerHandler.afterSave(Trigger.new, Trigger.isInsert ? null : Trigger.oldMap);
    }
}
