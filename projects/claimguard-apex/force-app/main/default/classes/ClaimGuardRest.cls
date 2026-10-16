@RestResource(urlMapping='/claimguard/v1/claims')
global with sharing class ClaimGuardRest {
    @HttpPost
    global static void createClaim() {
        RestRequest request = RestContext.request;
        RestContext.response.addHeader('Content-Type', 'application/json; charset=UTF-8');
        RestContext.response.addHeader('Cache-Control', 'no-store');
        String contentType = request.headers.get('Content-Type');
        String mediaType = contentType == null ? '' : contentType.substringBefore(';').trim().toLowerCase();
        if (mediaType != 'application/json') {
            respond(415, new Map<String, Object>{'error' => 'application_json_required'});
            return;
        }
        if (request.requestBody == null || request.requestBody.size() == 0) {
            respond(400, new Map<String, Object>{'error' => 'empty_body'});
            return;
        }
        if (request.requestBody.size() > 8192) {
            respond(413, new Map<String, Object>{'error' => 'body_too_large'});
            return;
        }
        try {
            ClaimGuardService.Intake input = (ClaimGuardService.Intake)
                JSON.deserializeStrict(request.requestBody.toString(), ClaimGuardService.Intake.class);
            ClaimGuardService.IntakeResult result = ClaimGuardService.create(input);
            respond(result.duplicate ? 200 : 201, new Map<String, Object>{
                'claimId' => result.claimId, 'duplicate' => result.duplicate
            });
        } catch (JSONException error) {
            respond(400, new Map<String, Object>{'error' => 'invalid_json_or_unknown_fields'});
        } catch (ClaimGuardPolicy.InvalidClaimException error) {
            respond(422, new Map<String, Object>{'error' => 'invalid_claim', 'message' => error.getMessage()});
        } catch (ClaimGuardService.ConflictException error) {
            respond(409, new Map<String, Object>{'error' => 'idempotency_conflict'});
        } catch (QueryException error) {
            respond(403, new Map<String, Object>{'error' => 'insufficient_access'});
        } catch (DmlException error) {
            StatusCode code = error.getDmlType(0);
            Boolean denied = code == StatusCode.INSUFFICIENT_ACCESS_OR_READONLY ||
                code == StatusCode.INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY ||
                code == StatusCode.INVALID_FIELD_FOR_INSERT_UPDATE;
            respond(denied ? 403 : 422, new Map<String, Object>{'error' => denied ? 'insufficient_access' : 'claim_not_saved'});
        } catch (Exception error) {
            // Do not leak request values, stack traces or database errors to callers.
            System.debug(LoggingLevel.ERROR, 'ClaimGuard intake failure: ' + error.getTypeName());
            respond(500, new Map<String, Object>{'error' => 'unexpected_error'});
        }
    }

    private static void respond(Integer status, Object body) {
        RestContext.response.statusCode = status;
        RestContext.response.responseBody = Blob.valueOf(JSON.serialize(body));
    }
}
