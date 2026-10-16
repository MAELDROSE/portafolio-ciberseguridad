// Run only in a dedicated Developer Edition or scratch org. Synthetic references only.
Set<String> keys = new Set<String>();
for (Integer i = 1; i <= 12; i++) keys.add('demo-claim-' + i);
Set<String> existingKeys = new Set<String>();
for (Bank_Claim__c claim : [SELECT External_Key__c FROM Bank_Claim__c WHERE External_Key__c IN :keys WITH USER_MODE]) {
    existingKeys.add(claim.External_Key__c);
}
List<Bank_Claim__c> samples = new List<Bank_Claim__c>();
for (Integer i = 1; i <= 12; i++) {
    String key = 'demo-claim-' + i;
    if (!existingKeys.contains(key)) {
        samples.add(new Bank_Claim__c(External_Key__c = key,
            Customer_Ref__c = 'demo-customer-' + i, Transaction_Ref__c = 'demo-transaction-' + i,
            Currency_Code__c = Math.mod(i, 2) == 0 ? 'CRC' : 'USD',
            Amount__c = Math.mod(i, 2) == 0 ? 650000 : 125.50,
            Category__c = Math.mod(i, 3) == 0 ? 'Unauthorized' : (Math.mod(i, 3) == 1 ? 'DoubleCharge' : 'ServiceIssue')));
    }
}
if (!samples.isEmpty()) insert as user samples;
System.debug(LoggingLevel.INFO, 'Synthetic claims inserted: ' + samples.size());
