public inherited sharing class ClaimGuardClock {
    @TestVisible private static Datetime testNow;

    public static Datetime now() {
        return testNow == null ? System.now() : testNow;
    }
}
