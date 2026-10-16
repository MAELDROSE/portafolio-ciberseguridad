/** Narrow, intentional system-mode writer. Agent permissions are read-only. */
public without sharing class ClaimGuardAudit {
    private static Boolean writing = false;

    public static Boolean isWriting() {
        return writing;
    }

    public static void append(List<Claim_Event__c> events) {
        if (events.isEmpty()) {
            return;
        }
        writing = true;
        try {
            // All-or-nothing: a business mutation must not outlive its audit event.
            insert as system events;
        } finally {
            writing = false;
        }
    }
}
