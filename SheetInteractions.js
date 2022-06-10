/**
 * Stricto Sensu it's a function but conceptually, we use it like a class. This class contains methods to interact with the user's google sheet. It encompasses all methods either to read or write in the spreadsheet.
 * @returns {Object} the frozen object with all the methods related to spreadsheet interactions.
 */
function SheetInteractions() {

    /**
     * A function to write data in a sheet after all the data that's already been written in it.
     * @param {String} sheetName the name of the sheet where to write the data
     * @param {Array} data the 2D-Array of data to append to the sheet
     */
    function _writeAfter(sheetName, data){
        sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        const lastRow = sheet.getDataRange().getLastRow();
        sheet.insertRowAfter(lastRow);
        sheet.getRange(lastRow + 1, 1, data.length, data[0].length).setValues(data);
    };

    /**
     * A function to retrieve the data from a given column in the spreadsheet
     * @param {String} sheetName the name of the sheet where we want to get the data
     * @param {String} columnTitle the column name where we want to get the data (column names can be found as keys in the global variables of the file variables.js).
     * @returns {Array} the array that contains the non empty data from the spreadsheet and without the column headers
     * 
     * getColumnData("Contacts", "email")
     * // => ["bastien.velitchkine@gmail.com", "dean.lamb@archspire.death", ...];
     */
    function _getColumnData(sheetName, columnTitle){
        const spreadsheetVar = globalVariables()["SPREADSHEET"];
        const emailColumn = spreadsheetVar["contactSheet"][columnTitle];
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const contactsRange = spreadsheet.getSheetByName(sheetName).getRange(emailColumn);
        return contactsRange.getValues().flat().filter((elem, index) => index !== 0 && elem !== "");
    }

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
        const emailData = _getColumnData(sheetName, "email");
        const statusData = _getColumnData(sheetName, "status")
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
            _writeAfter(sheetName, dataToWrite);
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
        const range = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName).getRange(cellRef);
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
        const date = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName).getRange(cellRef).getValue();
        return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
    }
  
    return Object.freeze({
      writeNewContacts,
      updateLastCheckedDate,
      getLastCheckedDate
    });
  }