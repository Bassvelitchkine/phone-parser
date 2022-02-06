/**
 * Stricto Sensu it's a function but conceptually, we use it like a class. This class contains methods to interact with Bullhorn, the CRM.
 * @returns {Object} the frozen object with all the methods related to Bullhorn interactions.
 */
function BullHorn() {
  
    /**
     * A function to send a request to Bullhorn's API and get an auth token. The auth token lies in the Headers of the response to the request.
     * @returns {Object} and object with "authToken" as key, and the actual token as value
     * 
     * _getAuthToken()
     * // => {"authToken": "22%h7Nudb03b3GhygE8g"}
     */
    function _getAuthToken() {
        const authUrl = secret()["authUrl"];  
        const clientId = secret()["clientId"];
        const username = secret()["username"];
        const password = secret()["password"];
        const url = `${authUrl}authorize?client_id=${clientId}&response_type=code&action=Login&username=${username}&password=${password}`;

        const options = {
            "method" : "GET",
            "muteHttpExceptions": true,
            "followRedirects": false // Very important
        }

        const resultHeaders = UrlFetchApp.fetch(url, options).getAllHeaders();
        return {
            "authToken": resultHeaders["Location"].match(/(?<=code=)[\d\w%\-]+/)[0]
        }
    }
  
    /**
     * A function to request the access token to Bullhorn's API once we have an auth token.
     * @param {Object} tokens the object that contains api tokens (only the auth token at this point) returned by Bullhorn's API.
     * @returns {Object} the updated tokens object with two extra (key, value) pairs, one for the access token and the other for the refresh token.
     * 
     * _getAccessToken({"authToken": "22%3A1e5faf9d-7bf4-4fa3-a767-486b9ced12e5"})
     * // => {"authToken": "22%3A1e5faf9d-7bf4-4fa3-a767-486b9ced12e5", "accessToken" : "22:81c69144-a86c-47d4-b13a-f1783f2ba2f7", "refreshToken" : "***"};
     */
    function _getAccessToken(tokens) {
        const authUrl = secret()["authUrl"];
        const clientId = secret()["clientId"];
        const apiSecret = secret()["apiSecret"];

        const url = `${authUrl}token?grant_type=authorization_code&code=${tokens["authToken"]}&client_id=${clientId}&client_secret=${apiSecret}`;
        const options = {
            "method" : "POST",
            "muteHttpExceptions": true
        }

        const fetchRes = JSON.parse(UrlFetchApp.fetch(url, options));
        tokens["accessToken"] = fetchRes["access_token"];
        tokens["refreshToken"] = fetchRes["refresh_token"];
        return tokens;
    }
  
    /**
     * A function that requests corporation tokens (restUrl and BhRestToken) to Bullhorn's API once we got the access token.
     * @param {Object} tokens the object that contains api tokens (auth token and access token at this point) returned by Bullhorn's API.
     * @returns {Object} the updated tokens object with two extra (key, value) pairs, one for the rest url and the other for the rest token.
     * 
     * _getRestTokens({"authToken": "22%3A1e5faf9d-7bf4-4fa3-a767-486b9ced12e5", "accessToken" : "22:81c69144-a86c-47d4-b13a-f1783f2ba2f7", "refreshToken" : "***")
     * // => {"authToken": "22%3A1e5faf9d-7bf4-4fa3-a767-486b9ced12e5", "accessToken" : "22:81c69144-a86c-47d4-b13a-f1783f2ba2f7", "refreshToken" : "***", "restToken":"2ad26465-c706-472d-a987-f0a60993b92b","restUrl":"https://rest22.bullhornstaffing.com/rest-services/xxx/"};
     */
    function _getRestTokens(tokens){
        const restUrl = secret()["restUrl"];
        const url = `${restUrl}login?version=*&access_token=${tokens["accessToken"]}`;
        const options = {
            "method" : "POST",
            "muteHttpExceptions": false
        };

        // We might have to loop a few times before we get an answer from the server (it happens that we encounter internal server errors)
        let success = false;
        while(!success){
            try {
                const fetchRes = JSON.parse(UrlFetchApp.fetch(url, options));
                tokens["restToken"] = fetchRes["BhRestToken"];
                tokens["restUrl"] = fetchRes["restUrl"];
                success = true;
                return tokens;
            } catch(e) {
                Logger.log(`An error occurred when gettin rest tokens: ${e}`);
            }
        }
    }
  
    /**
    * The function that gets every token that we need to interact with Bullhorn's API.
    * @returns {Object} every token that we got from the api and that will be necessary afterwards to request the Bullhorn REST API.
    * 
    * _getAllTokens()
    * // => {"authToken": "22%3A1e5faf9d-7bf4-4fa3-a767-486b9ced12e5", "accessToken" : "22:81c69144-a86c-47d4-b13a-f1783f2ba2f7", "refreshToken" : "***", "restToken": "2ad26465-c706-472d-a987-f0a60993b92b","restUrl": "https://rest22.bullhornstaffing.com/rest-services/xxx/"};
    */
    function _getAllTokens(){
        return _getRestTokens(_getAccessToken(_getAuthToken()));
    }
  
    /**
     * A function that processes the data returned by the API after we searched for existing ClientContacts or Leads in the CRM with a given email address.
     * @param {Object} contactsData the object returned by Bullhorn's API after we searched for existing contact entities
     * @returns {Object or null} null if no contact was found in the CRM, the object with data on the contact found if any (we keep only contacts that resulted in a 100% match score)
     * 
     * _parseFetchedContacts({..., "data": [{"id": 46255, "email": "bastien.velitchkine@gmail.com", "phone": null, "_score": 1.0}, {"id": 98368, "email": "bastien.velitchkine@student-cs.fr", "phone": "+33760769872", "_score": 0.5}, ...]})
     * // => {"id": 46255, "email": "bastien.velitchkine@gmail.com", "phone": null, "_score": 1.0};
     * 
     * _parseFetchedContacts({..., "data": [{"id": 87639, "email": "bastien.velitchkine@gmail.com", "phone": null, "mobile": "+33760769872", "_score": 1.0}]})
     * // => {"id": 46255, "email": "bastien.velitchkine@gmail.com", "phone": null, "mobile": "+33760769872", "_score": 1.0};
     */
    function _parseFetchedContacts(contactsData){
        if (contactsData["data"].length === 0){
            return null;
        } else {
            return contactsData["data"].filter(elem => elem["_score"] === 1.)[0];
        }
    }
  
    /**
     * A function to look for existing ClientContacts in the CRM that have the email address passed in the params.
     * @param {Object} tokens every Bullhorn token needed to interact with the API.
     * @param {String} clientEmail the email that we're looking for, on ClientContacts in the CRM.
     * @returns {Object or null} null if no contact was found in the CRM, the object with data on the contact found if any (we keep only contacts that resulted in a 100% match score), and null if we encountered an error during the request.
     * 
     * _searchClient({..., "restToken": "2ad26465-c706-472d-a987-f0a60993b92b"}, "bastien.velitchkine@gmail.com")
     * // => {"id": 46255, "email": "bastien.velitchkine@gmail.com", "phone": null, "_score": 1.0};
     * 
     * _searchClient({..., "restToken": "2ad26465-c706-472d-a987-f0a60993b92b"}, "dean.lamn@archspire.death")
     * // => null;
     */
    function _searchClient(tokens, clientEmail){
        const url = `${tokens["restUrl"]}search/ClientContact?query=email:${clientEmail}&count=1&fields=id,email,phone`;
        const options = {
            "method": "GET",
            "headers": {
                "BhRestToken": tokens["restToken"]
            }
        };

        try{
            const fetchedRes = JSON.parse(UrlFetchApp.fetch(url, options));
            return _parseFetchedContacts(fetchedRes)
        } catch(e) {
            Logger.log(`The following error occured: ${e}`);
            return null;
        }
    }
  
    /**
     * A function to look for existing Leads in the CRM that have the email address passed in the params.
     * @param {Object} tokens every Bullhorn token needed to interact with the API.
     * @param {String} clientEmail the email that we're looking for, on Leads in the CRM.
     * @returns {Object or null} null if no contact was found in the CRM, the object with data on the contact found if any (we keep only contacts that resulted in a 100% match score), and null if we encountered an error during the request.
     * 
     * _searchLead({..., "restToken": "2ad26465-c706-472d-a987-f0a60993b92b"}, "bastien.velitchkine@gmail.com")
     * // => {"id": 98473, "email": "bastien.velitchkine@gmail.com", "phone": null, "mobile": "+33760769872", "_score": 1.0};
     * 
     * _searchLead({..., "restToken": "2ad26465-c706-472d-a987-f0a60993b92b"}, "dean.lamn@archspire.death")
     * // => null;
     */
    function _searchLead(tokens, leadEmail){
      const url = `${tokens["restUrl"]}search/Lead?query=email:${leadEmail}&count=1&fields=id,email,phone, mobile`;
      const options = {
        "method": "GET",
        "headers": {
            "BhRestToken": tokens["restToken"]
        }
      };
  
      const fetchedRes = JSON.parse(UrlFetchApp.fetch(url, options));
      return _parseFetchedContacts(fetchedRes)
    }
  
    /**
     * A function to update the phone number of a given ClientContact in Bullhorn.
     * @param {Object} tokens every Bullhorn token needed to interact with the API.
     * @param {Number} clientId the id of the ClientContact whose phone number to update
     * @param {String} phoneNumber the phone number to put on the contact
     * @returns {String} the update status, "updated" if the update was successful, and "error" if we ran into an error.
     * 
     * _updateClientPhoneNumber({..., "restToken": "2ad26465-c706-472d-a987-f0a60993b92b"}, 46255, "+33760769872")
     * // => "updated";
     */
    function _updateClientPhoneNumber(tokens, clientId, phoneNumber){
      const url = `${tokens["restUrl"]}entity/ClientContact/${clientId}?BhRestToken=${tokens["restToken"]}`;
      const payload = {
        "phone": String(phoneNumber)
      }
      const options = {
        "method": "POST",
        "payload": JSON.stringify(payload)
      };
  
      try{
        const responseCode = UrlFetchApp.fetch(url, options).getResponseCode();
        if(Math.floor(responseCode / 100) === 2){
          return "updated";
        }
      } catch(e) {
        Logger.log(`Something went wrong when updating client ${clientId}: ${e}`);
        return "error";
      }
    }
  
    /**
     * A function to update the phone number of a given Lead in Bullhorn.
     * @param {Object} tokens every Bullhorn token needed to interact with the API.
     * @param {Number} leadId the id of the Lead whose phone number to update
     * @param {String} phoneNumber the phone number to put on the contact
     * @param {String} fieldName the name of the field on which to update the phone number (either "phone" or "mobile")
     * @returns {String} the update status, "updated" if the update was successful, and "error" if we ran into an error.
     * 
     * _updateLeadPhoneNumber({..., "restToken": "2ad26465-c706-472d-a987-f0a60993b92b"}, 75635, "+3356480284", "mobile")
     * // => "updated";
     */
    function _updateLeadPhoneNumber(tokens, leadId, phoneNumber, fieldName){
        const url = `${tokens["restUrl"]}entity/ClientContact/${leadId}?BhRestToken=${tokens["restToken"]}`;
        let payload = {};
        payload[fieldName] = String(phoneNumber);

        const options = {
            "method": "POST",
            "payload": JSON.stringify(payload)
        };

        try{
            const responseCode = UrlFetchApp.fetch(url, options).getResponseCode();
            if(Math.floor(responseCode / 100) === 2){
                return "updated";
            }
        } catch(e) {
            Logger.log(`Something went wrong when updating client ${clientId}: ${e}`);
            return "error";
        }
    }
  
    /**
     * A function to update contacts in the CRM that need an update. So we start by looking for ClientContacts or Leads with the CRM, and if we found any, depending on whether or not they already have phone numbers, we update them. Note that if we found both a ClientContact and a Lead, we will update them both if need be.
     * @param {Object} tokens every Bullhorn token needed to interact with the API.
     * @param {Object} contactData an object with data on the contact to update (email and phoneNumber, mainly)
     * @returns {String} the updated status, either: "updated" if the phone number was successfully updated, "not found" if the email address of the contact was not found, "error" if there was an error, "already a number" if there's already a phone number for the contact in the CRM.
     * 
     * _updateContactPhoneNumber({..., "restToken": "2ad26465-c706-472d-a987-f0a60993b92b"}, {"email": "bastien.velitchkine@gmail.com", "phoneNumber": "+33 7 60 76 98 72", "lineIndex": 3})
     * // => "updated";
     */
    function _updateContactPhoneNumber(tokens, contactData){
        const {email, phoneNumber} = contactData;
        const foundClient = _searchClient(tokens, email);
        const foundLead = _searchLead(tokens, email);

        if (foundClient){
            if(!foundClient["phone"]){
                return _updateClientPhoneNumber(tokens, Number(foundClient["id"]), phoneNumber);
            } else {
                return "already a number";
            }
        }

        if (foundLead){
            if (!foundLead["phone"]){
                return _updateLeadPhoneNumber(tokens, Number(foundLead["id"]), phoneNumber, "phone");
            } else if (!foundLead["mobile"]){
                return _updateLeadPhoneNumber(tokens, Number(foundLead["id"]), phoneNumber, "mobile");
            } else {
                return "already a number";
            }
        }

        return "not found";
    }
  
    /**
     * A function that first gets all tokens required for the update and then updates all the contacts that need an update in the CRM.
     * @param {Array} contactsData an array with objects with data on the contacts to update (email and phoneNumber, mainly)
     * @returns {Array} a 2D array with line indexes in the first column (indexes of lines in the spreadsheet where to write the update status) and the update status in the second column (see _updateContactPhoneNumber)
     * 
     * updateContactsPhoneNumbers([{"email": "bastien.velitchkine@gmail.com", "phoneNumber": "+33 7 60 76 98 72", "lineIndex": 3}, {"email": "dickie.allen@infant.annihilator", "phoneNumber": "0687302847", "phoneNumber": 10}, ...]);
     * // => [[3, "updated"], [10, "already a number"], ...];
     */
    function updateContactsPhoneNumbers(contactsData){
        const tokens = _getAllTokens();
        const updatedStatuses = contactsData.map(contactData => [contactData["lineIndex"], _updateContactPhoneNumber(tokens, contactData)]);
        return updatedStatuses;
    }
    
    return Object.freeze({
        updateContactsPhoneNumbers
    });
}