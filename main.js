/**
 * A function to trigger on specific times to extract emails from the mail box and put them in the spreadsheet. 
 */
 function extractPhoneNumbersFromEmails(){
    // Instantiate objects
    const myMailService = MailService();
    const myPhoneParser = PhoneParser();
    const sheetInterface = SheetInteractions();

    // Get all messages since last time
    const lastCheckedDate = sheetInterface.getLastCheckedDate();
    const stopLists = sheetInterface.getStopLists();
    const messages = myMailService.getMessagesSince(lastCheckedDate);
    const processedMessages = myMailService.messagesProcessing(messages, stopLists["domainStopList"]);

    // Extract phone numbers
    let result = {};
    Object.entries(processedMessages).forEach(elem => {
        const email = elem[0];
        const text = elem[1];
        result[email] = myPhoneParser.extractPhoneNumbers(String(text), stopLists["phoneStopList"]);
    });

    // Write results to the sheet
    sheetInterface.writeNewContacts(result);
    // Update the last checked date
    sheetInterface.updateLastCheckedDate();
}