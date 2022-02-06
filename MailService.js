/**
 * Stricto Sensu it's a function but conceptually, we use it like a class. This class contains a few variables but most importantly methods to interact witht the user's gmail mail box.
 * @returns {Object} the frozen object with all the methods related to gmail interactions.
 */
 function MailService() {

    /**
     * A function to query every message in the mailbox since a given date.
     */
    function getMessagesSince(date){
      const today = new Date();
      const query = `after:${date} before:${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}`;
      const threads = GmailApp.search(query);
      return threads.map(thread => thread.getMessages()).flat();
    }

    /**
     * A function to get the email of the sender of an email currently formatted like "Bastien Velitchkine <bastien.velitchkine@gmail.com>".
     */
    function _extractEmail(sender){
      if (sender.includes("<")){
        return sender.match(/<.+>/g)[0].replace(/<|>/g, "");
      } else {
        return sender.match(/\S+@([\w\d]+\.?){2}/)[0]
      }
    }

    /**
     * A function to filter out messages sent by walb and put them in a more suitable format: {senderEmail: message}
     */
    function messagesProcessing(messages){
      // Filter out messages sent by WALB
      const filteredMessages = messages.filter(message => !message.getFrom().match(/.+@walbpartners.com/g));
      const result = filteredMessages.map(message => {
        let temp = {};
        temp[_extractEmail(message.getFrom())] = message.getPlainBody() //.slice(0,100);
        return temp;
      });

      // For a given email, messages can all be concatenated
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
