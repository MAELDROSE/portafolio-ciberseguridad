@IsTest
public class ClaimGuardTestFactory {
    public static void setupUsers() {
        Profile minimal = [
            SELECT Id FROM Profile WHERE UserType = 'Standard'
                AND PermissionsModifyAllData = false AND PermissionsViewAllData = false
                AND UserLicense.Name = 'Salesforce'
            ORDER BY Name ASC LIMIT 1
        ];
        List<User> users = new List<User>();
        for (String marker : new List<String>{'CGAgent', 'CGOther', 'CGBlock', 'CGView'}) {
            String suffix = UserInfo.getOrganizationId() + '.' + String.valueOf(Crypto.getRandomInteger()).replace('-', 'n');
            users.add(new User(Alias = marker, LastName = marker,
                Username = marker + '.' + suffix + '@example.invalid',
                Email = marker + '@example.invalid', ProfileId = minimal.Id,
                TimeZoneSidKey = 'America/Costa_Rica', LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8', LanguageLocaleKey = 'en_US'));
        }
        insert users;
        Map<String, Id> permissionIds = new Map<String, Id>();
        for (PermissionSet permissions : [SELECT Id, Name FROM PermissionSet WHERE Name IN ('ClaimGuard_Agent', 'ClaimGuard_Viewer')]) {
            permissionIds.put(permissions.Name, permissions.Id);
        }
        List<PermissionSetAssignment> assignments = new List<PermissionSetAssignment>();
        for (User user : users) {
            if (user.LastName != 'CGBlock') {
                assignments.add(new PermissionSetAssignment(AssigneeId = user.Id,
                    PermissionSetId = permissionIds.get(user.LastName == 'CGView' ? 'ClaimGuard_Viewer' : 'ClaimGuard_Agent')));
            }
        }
        insert assignments;
    }

    public static User user(String marker) {
        return [SELECT Id FROM User WHERE LastName = :marker AND Email LIKE '%@example.invalid' LIMIT 1];
    }

    public static Bank_Claim__c claim(String key) {
        return new Bank_Claim__c(External_Key__c = key, Customer_Ref__c = 'demo-customer-001',
            Transaction_Ref__c = 'demo-txn-' + key, Amount__c = 125.50,
            Currency_Code__c = 'USD', Category__c = 'ServiceIssue');
    }

    public static ClaimGuardService.Intake intake(String key) {
        ClaimGuardService.Intake input = new ClaimGuardService.Intake();
        input.externalKey = key;
        input.customerRef = 'demo-customer-001';
        input.transactionRef = 'demo-txn-' + key;
        input.amount = 125.50;
        input.currencyCode = 'USD';
        input.category = 'ServiceIssue';
        return input;
    }
}
