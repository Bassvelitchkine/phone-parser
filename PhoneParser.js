/**
 * Stricto Sensu it's a function but conceptually, we use it like a class. This class contains a few variables but most importantly methods to parse the html content of our crunchbase alert emails.
 * @returns {Object} the frozen object with all the methods related to crunchbase emails' html parsing.
 */
 function PhoneParser() {

    /**
     * A function to extract phone numbers from a text
     */
    function extractPhoneNumbers(text){
      const regex = /\+?(\d{1,2}[\-\s\.]?)(\s?\(0\)\s?)?(\d[\-\s\.]?)?(\d{2}[\-\s\.]?){4,6}/g;
      const result = text.match(regex);
      const stopList = globalVariables()["PROCESSING"]["phoneStopList"];
  
      if (result) {
        return result.filter(number => number.match(/^(\+|0).*/)).reduce((acc, number) => {
          if (!acc.includes(number) && !stopList.includes(number.trim())){
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