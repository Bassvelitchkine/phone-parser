function BullHorn() {
    // AUTHENTICATION
  
    /**
     * A function to send a request to Bullhorn's API and get an auth token. 
     * The request is meant to be intercepted, which explains this way of handling the promise (see background.js for explainations)
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
       "followRedirects": false
      }
     
      const resultHeaders = UrlFetchApp.fetch(url, options).getAllHeaders();
      return {
        "authToken": resultHeaders["Location"].match(/(?<=code=)[\d\w%\-]+/)[0]
      }
    }
  
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
  
    function _getRestTokens(tokens){
      const restUrl = secret()["restUrl"]
      const url = `${restUrl}login?version=*&access_token=${tokens["accessToken"]}`;
      const options = {
       "method" : "POST",
       "muteHttpExceptions": false
      }
  
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
  
    function getAllTokens(){
      return _getRestTokens(_getAccessToken(_getAuthToken()));
    }
  
    // REST API REQUESTS
    function _parseFetchedContacts(contactsData){
      if (contactsData["data"].length === 0){
        return null;
      } else {
        return contactsData["data"].filter(elem => elem["_score"] === 1.)[0];
      }
      
    }
  
    function searchClient(tokens, clientEmail){
      const url = `${tokens["restUrl"]}search/ClientContact?query=email:${clientEmail}&count=1&fields=id,email,phone`;
      const options = {
        "method": "GET",
        "headers": {
            "BhRestToken": tokens["restToken"]
        }
      };
  
      const fetchedRes = JSON.parse(UrlFetchApp.fetch(url, options));
      return _parseFetchedContacts(fetchedRes)
    }
  
    function searchLead(tokens, leadEmail){
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
  
    function _updateContactPhoneNumber(tokens, contactData){
      const {email, phoneNumber} = contactData;
      const foundClient = searchClient(tokens, email);
      const foundLead = searchLead(tokens, email);
  
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
  
    function updateContactsPhoneNumbers(contactsData){
      const tokens = getAllTokens();
      const updatedStatuses = contactsData.map(contactData => [contactData["lineIndex"], _updateContactPhoneNumber(tokens, contactData)]);
      return updatedStatuses;
    }
    
    return Object.freeze({
      updateContactsPhoneNumbers
    });
  }
  
  function testBullhorn(){
    const temp = BullHorn();
    // Logger.log(temp._getAuthToken());
    // Logger.log(temp._getAccessToken("22%3A558bda06-7af9-44ce-9a67-4aa3bfe80542"));
    var tokens = null;
    while (!tokens){
      try{
        tokens = temp.getAllTokens();
        Logger.log(temp.searchLead(tokens, "a.thominet@ecsgroup.aero"));
      } catch(e){Logger.log(e)}
    }
  }  