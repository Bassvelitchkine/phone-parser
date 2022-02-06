/**
 * Stricto Sensu it's a function but conceptually, we use it like a class. This class contains methods to interact witht the user's gmail mail box.
 * @returns {Object} the frozen object with all the methods related to gmail interactions.
 */
 function MailService() {

    /**
     * A function that returns every message in the user's mail box that was sent or received between a given date and the date of execution.
     * @param {String} date a date string indicating when to start the search (yyyy/m/d)
     * @returns {Array} an array of Gmail Messages, every message found in the mailbox for messages sent or received between the date parameter and the date of execution.
     */
    function getMessagesSince(date){
        const today = new Date();
        const query = `after:${date} before:${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}`;
        const threads = GmailApp.search(query);
        return threads.map(thread => thread.getMessages()).flat();
    }

    /**
     * A function that extracts the email address of an email sender from the sender info (see example).
     * @param {String} sender a string with the sender info
     * @returns {String} the email address of the sender
     * 
     * _extractEmail("Bastien Velitchkine <bastien.velitchkine@gmail.com>")
     * // => "bastien.velitchkine@gmail.com";
     */
    function _extractEmail(sender){
        if (sender.includes("<")){
            // Case when the email address is between inferior and superior signs.
            return sender.match(/<.+>/g)[0].replace(/<|>/g, "");
        } else {
            // Case when the email address is not between inferior/superior sign
            return sender.match(/\S+@([\w\d]+\.?){2}/)[0]
        }
    }

    /**
     * A function to filter out messages sent by stop domains (if the gmail mailbox belongs to company, then messages from @company.com should be excluded because phone numbers of interest won't be found inside). We also put the messages in a more suitable format (see example).
     * @param {Array} messages array of GMail messages
     * @returns {Object} an object with sender's email addresses as keys and associated message text as values, except messages from sender's that have email addresses in the stop domains.
     * 
     * // Assuming that /@walbpartners.com/g is in our list of stop domains.
     * messagesProcessing(GMailMessage("Bastien Velitchkine <bastien.velitchkine@gmail.com>", "Bonjour enchanté, ..., Bastien Velitchkine, Automation Engineer, +33 7 60 76 98 72"), GMailMessage("Bastien Velitchkine <bastien.velitchkine@gmail.com>", "Hello Bastien, As-tu reçu mon dernier message ? Alexandre, CEO @ WALB Partners, +33 6 89 43 56 10"), GMailMessage("Bastien Velitchkine <bastien.velitchkine@gmail.com>", "Très bien, ok pour moi ! Bonne soirée, Bastien Velitchkine, Automation Engineer, +33 7 60 76 98 72"), GMailMessage("Stuff dean.lamb@archspire.death>", "Hi French folk, I'm super stoked that you like our art. I hope you'll come see us as soon as we start touring again. Stay metal! Dean 🤘"))
     * // => {"bastien.velitchkine@gmail.com": "Bonjour enchanté, ..., Bastien Velitchkine, Automation Engineer, +33 7 60 76 98 72 Très bien, ok pour moi ! Bonne soirée, Bastien Velitchkine, Automation Engineer, +33 7 60 76 98 72", "dean.lamb@archspire.death": "Hi French folk, I'm super stoked that you like our art. I hope you'll come see us as soon as we start touring again. Stay metal! Dean 🤘"}
     */
    function messagesProcessing(messages){
    // Filter out messages sent from the stop domains
    const stopDomains = variables()["PROCESSING"]["domainStopList"];
    const filteredMessages = messages.filter(message => {
        const messageSender = message.getFrom();
        const toKeep = stopDomains.map(stopDomain => !messageSender.match(stopDomain)).reduce((acc, elem) => acc && elem, true)
        return toKeep;
    });

    const result = filteredMessages.map(message => {
        let temp = {};
        temp[_extractEmail(message.getFrom())] = message.getPlainBody();
        return temp;
    });

    // All messages from a given sender can be concatenated
    return result.reduce((accumulator, message) => {
        const messageItems = Object.entries(message)[0];
        const email = messageItems[0];
        const text = messageItems[1];
        if (Object.keys(accumulator).includes(email)){
            accumulator[email] = accumulator[email] + " " + text;
        } else {
            accumulator[email] = text;
        };
            return accumulator
        }, {});
    }

    return Object.freeze({
        getMessagesSince,
        messagesProcessing
    });
};
