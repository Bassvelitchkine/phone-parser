/**
 * Stricto Sensu it's a function but conceptually, we use it like a class. This class contains methods to parse the content of email messages and find phone numbers.
 * @returns {Object} the frozen object with all the methods related to emails' parsing.
 */
 function PhoneParser() {

    /**
     * A function to extract phone numbers from a text, except numbers in a given stop list (because if the company sent an email with its phone number in the first place, the answer might contain that first message and the phone number that was in it i.e yours, that should be excluded obviously).
     * @param {String} text a long text with the content of the messages of a given sender
     * @returns {Array} the list of all phone numbers found in the text (deduped)
     * 
     * // Assuming that "+33 6 89 43 56 10" is the only number in the phone number stop list.
     * extractPhoneNumbers(Bonjour enchanté, ..., Bastien Velitchkine, Automation Engineer, +33 7 60 76 98 72 Très bien, ok pour moi ! Bonne soirée, Bastien Velitchkine, Automation Engineer, +33 7 60 76 98 72)
     * // => ["+33 7 60 76 98 72"];
     */
    function extractPhoneNumbers(text, stopList){
        // The regular expression to find phone numbers. Test it on regex101.com if need be.
        const regex = /\+?(\d{1,2}[\-\s\.]?)(\s?\(0\)\s?)?(\d[\-\s\.]?)?(\d{2}[\-\s\.]?){4,6}/g;
        const result = text.match(regex);

        if (result) {
            // Some extra processing to make sure that extracted numbers begin by a "+" or "0" and keep only unique phone numbers
            return result.filter(number => number.match(/^(\+|0).*/)).reduce((acc, number) => {
                if (!acc.includes(number) && !stopList.includes(number.trim())){
                    // The extra ' at the beginning of the phone number makes sure that google sheet interprets the value as a string and not as a number (otherwise, numbers beginning with a "0" would have their "0" removed)
                    acc.push(`'${number.trim()}`);
                }
                return acc;
            }, []);
        } else {
            return [];
        }
    };
      
    return Object.freeze({
      extractPhoneNumbers
    });
  };