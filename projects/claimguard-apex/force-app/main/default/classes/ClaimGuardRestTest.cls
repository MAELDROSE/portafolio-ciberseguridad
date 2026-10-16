@IsTest
private class ClaimGuardRestTest {
    @TestSetup static void setup() { ClaimGuardTestFactory.setupUsers(); }

    private static Integer send(String body, String contentType) {
        RestRequest request = new RestRequest();
        request.requestURI = '/services/apexrest/claimguard/v1/claims';
        request.httpMethod = 'POST';
        if (contentType != null) request.addHeader('Content-Type', contentType);
        request.requestBody = Blob.valueOf(body);
        RestContext.request = request;
        RestContext.response = new RestResponse();
        ClaimGuardRest.createClaim();
        return RestContext.response.statusCode;
    }
    @IsTest static void createThenReplayReturns201Then200() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            String body = JSON.serialize(ClaimGuardTestFactory.intake('rest-replay'));
            System.assertEquals(201, send(body, 'application/json; charset=utf-8'));
            System.assertEquals(200, send(body, 'application/json'));
            Map<String, Object> response = (Map<String, Object>) JSON.deserializeUntyped(RestContext.response.responseBody.toString());
            System.assertEquals(true, response.get('duplicate'));
            System.assertNotEquals(null, response.get('claimId'));
        }
    }
    @IsTest static void rejectsMalformedJsonAndUnknownFields() {
        System.assertEquals(400, send('{bad', 'application/json'));
        System.assertEquals(400, send('{"admin":true}', 'application/json'));
        System.assertEquals(400, send('', 'application/json'));
    }
    @IsTest static void rejectsUnsupportedContentTypeAndOversizedBody() {
        System.assertEquals(415, send('{}', 'text/plain'));
        System.assertEquals(415, send('{}', null));
        System.assertEquals(415, send('{}', ';'));
        System.assertEquals(415, send('{}', 'application/json-extra'));
        String body = 'x';
        while (body.length() < 9000) body += body;
        System.assertEquals(413, send(body, 'application/json'));
    }
    @IsTest static void invalidBusinessInputReturns422() {
        ClaimGuardService.Intake input = ClaimGuardTestFactory.intake('rest-invalid');
        input.amount = -20;
        System.assertEquals(422, send(JSON.serialize(input), 'application/json'));
        System.assertEquals(422, send('null', 'application/json'));
    }
    @IsTest static void changedPayloadReturns409() {
        System.runAs(ClaimGuardTestFactory.user('CGAgent')) {
            ClaimGuardService.Intake input = ClaimGuardTestFactory.intake('rest-conflict');
            System.assertEquals(201, send(JSON.serialize(input), 'application/json'));
            input.amount = 400;
            System.assertEquals(409, send(JSON.serialize(input), 'application/json'));
        }
    }
    @IsTest static void permissionDenialReturns403WithoutRecordData() {
        System.runAs(ClaimGuardTestFactory.user('CGBlock')) {
            System.assertEquals(403, send(JSON.serialize(ClaimGuardTestFactory.intake('rest-denied')), 'application/json'));
            String body = RestContext.response.responseBody.toString();
            System.assertEquals(false, body.contains('claimId'));
            System.assertEquals(false, body.contains('demo-customer'));
        }
    }
}
