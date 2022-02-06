function SheetInteractions() {
    /**
     * A function to get the list of every contact email processed hitherto
     */
    function _retrieveExistingContacts(){
      const spreadsheetVar = globalVariables()["SPREADSHEET"];
      const sheetName = spreadsheetVar["contactSheet"]["sheetName"];
      return getColumnData(sheetName, "email");
    }
  
    /**
     * Update the last check date
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
     * Retrieves the last check date
     */
    function getLastCheckedDate(){
      const spreadsheetVar = globalVariables()["SPREADSHEET"];
      const sheetName = spreadsheetVar["parametersSheet"]["sheetName"];
      const cellRef = spreadsheetVar["parametersSheet"]["lastCheckDate"]
      const date = SpreadsheetApp.openById(spreadsheetVar["spreadsheetId"]).getSheetByName(sheetName).getRange(cellRef).getValue();
      return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
    }
  
    /**
     * A function to write new contacts and phones in the spreadsheet
     * 
     */
    function writeNewContacts(processedMessages){
      let dataToWrite = [];
      const existingEmails = _retrieveExistingContacts();
      Object.entries(processedMessages).forEach(([email, phoneNumbers]) => {
        if (!existingEmails.includes(email) && phoneNumbers.length > 0){
          dataToWrite.push([email, phoneNumbers[0], "waiting"])
        }
      });
      if (dataToWrite.length > 0){
        const sheetName = globalVariables()["SPREADSHEET"]["contactSheet"]["sheetName"];
        writeAfter(sheetName, dataToWrite);
      }
    }
  
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
        allData[contact[0] + 1][statusColumn] = contact[1];
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
  