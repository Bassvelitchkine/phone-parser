/**
 * Creates a custom menu whenever someone opens the spreadsheet.
 * @customfunction
 */
 function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('👉 MENU 👈')
      .addItem('📧 Scan', "extractPhoneNumbersFromEmails").addToUi();    
  }