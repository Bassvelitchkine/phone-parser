/**
 * Stricto Sensu it's a function but conceptually, we use it like a class. This class contains methods to interact with the user's google sheet. It encompasses all methods either to read or write in the spreadsheet.
 * @returns {Object} the frozen object with all the methods related to spreadsheet interactions.
 */
function SheetInteractions() {

    /**
     * A function to get the list of every contact email processed hitherto excluding email addresses when a phone number was found in the CRM or updated.
     * @returns {Array} an array with every email address processed insofar, except for those stated above
     * 
     * _retrieveEmailsToExclude()
     * // => ["bastien.velitchkline@gmail.com", "dean.lamb@archspire.death", ...];
     */
    function _retrieveEmailsToExclude(){
        const spreadsheetVar = globalVariables()["SPREADSHEET"];
        const sheetName = spreadsheetVar["contactSheet"]["sheetName"];
        const emailData = getColumnData(sheetName, "email");
        const statusData = getColumnData(sheetName, "status")
        // We remove email addresses for which phone numbers have already been found and/or updated
        return emailData.filter((_, index) => statusData[index] !== "already a number" && statusData[index] === "updated" );
    }

    /**
     * A function to write new contacts and phones in the spreadsheet by making sure that they've not been already dealt with.
     * @param {Object} processedMessages an object with email addresses as keys and a list of phoneNumbers as values.
     */
    function writeNewContacts(processedMessages){
        let dataToWrite = [];
        const emailsToExclude = _retrieveEmailsToExclude();
        Object.entries(processedMessages).forEach(([email, phoneNumbers]) => {
        if (!emailsToExclude.includes(email) && phoneNumbers.length > 0){
            dataToWrite.push([email, phoneNumbers[0], "waiting"])
            }
        });
        if (dataToWrite.length > 0){
            const sheetName = globalVariables()["SPREADSHEET"]["contactSheet"]["sheetName"];
            writeAfter(sheetName, dataToWrite);
        }
    }
  
    /**
     * Update the last check date. We need to keep this value in storage (therefore, in the spreadsheet because we always start the mailbox starting from the date of the last check).
     * We take the time of the execution as the date of the last check (yyyy/m/d).
     * 
     */
    function updateLastCheckedDate(){
        const today = new Date();
        const date = `${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}`;
        const spreadsheetVar = globalVariables()["SPREADSHEET"];
        const sheetName = spreadsheetVar["parametersSheet"]["sheetName"];
        const cellRef = spreadsheetVar["parametersSheet"]["lastCheckDate"]
        const range = SpreadsheetApp.openById(spreadsheetVar["spreadsheetId"]).getSheetByName(sheetName).getRange(cellRef);
        range.setValue(date);
    }

    /**
     * Since we scan mailboxes from the time of the last scan, we need first to retrive the date of the last check.
     * @returns {String} the date of the last check (yyyy/m/d)
     * 
     * getLastCheckedDate()
     * // => "2022/2/6";
     */
    function getLastCheckedDate(){
        const spreadsheetVar = globalVariables()["SPREADSHEET"];
        const sheetName = spreadsheetVar["parametersSheet"]["sheetName"];
        const cellRef = spreadsheetVar["parametersSheet"]["lastCheckDate"]
        const date = SpreadsheetApp.openById(spreadsheetVar["spreadsheetId"]).getSheetByName(sheetName).getRange(cellRef).getValue();
        return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
    }
  
    /**
     * A function that gets all the email addresses and phone numbers of contacts with a pending ("waiting", actually) status in the spreadsheet. They're the contacts to update in the CRM.
     * @returns {Array} a 2D array of data on contacts to try and update in the CRM. In the last column, we keep the line indexes of the contacts, because we will then need to update the status of these contacts on these specific lines.
     * 
     * getContactsToUpdate()
     * // => [{"email": "bastien.velitchkine@gmail.com", "phoneNumber": "+33 7 60 76 98 72", "lineIndex": 3}, {"email": "dickie.allen@infant.annihilator", "phoneNumber": "0687302847", "phoneNumber": 10}, ...];
     */
    function getContactsToUpdate(){
        const spreadsheetVar = globalVariables()["SPREADSHEET"];
        const sheetName = spreadsheetVar["contactSheet"]["sheetName"];

        // Get column indexes
        let statusColumn = spreadsheetVar["contactSheet"]["status"].split(":")[0];
        statusColumn = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(statusColumn);
        let emailColumn = spreadsheetVar["contactSheet"]["email"].split(":")[0];
        emailColumn = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(emailColumn);
        let phoneColumn = spreadsheetVar["contactSheet"]["phone"].split(":")[0];
        phoneColumn = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(phoneColumn);

        let contactsData = SpreadsheetApp.openById(spreadsheetVar["spreadsheetId"]).getSheetByName(sheetName).getDataRange().getValues();

        // Slice to remove the column headers
        contactsData = contactsData.slice(1).map((line, index) => {
            line.push(index);
            return line;
        }).filter(line => line[statusColumn] === "waiting");

        return contactsData.map(line => {
            let temp = {};
            temp["email"] = line[emailColumn];
            temp["phoneNumber"] = String(line[phoneColumn]);
            temp["lineIndex"] = line[line.length - 1];
            return temp;
        });
    }
  
    /**
     * A function that updates the status of the contacts after we looked them up in the CRM and eventually updated them. Following the CRM requests, there might be various outcomes: "updated" if the phone number was successfully updated, "not found" if the email address of the contact was not found, "error" if there was an error, "already a number" if there's already a phone number for the contact in the CRM.
     * @param {Array} updatedContacts a 2D array with line indexes on the first column and the update status in the second column. The line indexes or the indexes of the lines in the spreadsheet from which contacts were extracted.
     */
    function updateContactsStatuses(updatedContacts){
        const spreadsheetVar = globalVariables()["SPREADSHEET"];
        const sheetName = spreadsheetVar["contactSheet"]["sheetName"];

        // Get column indexes
        let statusColumn = spreadsheetVar["contactSheet"]["status"].split(":")[0];
        statusColumn = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(statusColumn);
        let dateColumn = spreadsheetVar["contactSheet"]["lastStatusUpdate"].split(":")[0];
        dateColumn = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(dateColumn);

        const now = new Date(Date.now());
        const currentDate = now.toLocaleString()

        const range = SpreadsheetApp.openById(spreadsheetVar["spreadsheetId"]).getSheetByName(sheetName).getDataRange();
        let allData = range.getValues();
        updatedContacts.forEach(contact => {
            // contact has a lineIndex on the first column and an update status on the second column.
            allData[contact[0] + 1][statusColumn] = contact[1];
            // We also put a timestamp in the spreadsheet to mark the last update
            allData[contact[0] + 1][dateColumn] = currentDate;
        })
        range.setValues(allData);
    }
  
    return Object.freeze({
      writeNewContacts,
      updateLastCheckedDate,
      getLastCheckedDate,
      getContactsToUpdate,
      updateContactsStatuses
    });
  }
  