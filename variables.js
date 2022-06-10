function globalVariables() {
    return Object.freeze({
      "SPREADSHEET": {
        "contactSheet": {
          "sheetName": "Contacts",
          "email": "A:A",
          "phone": "B:B",
          "status": "C:C",
          "lastStatusUpdate": "D:D"
        },
        "parametersSheet": {
          "sheetName": "Parameters",
          "lastCheckDate": "A2"
        }
      },
      "PROCESSING": {
        "phoneStopList": ["0760769872"],
        "domainStopList": [/@walbpartners.com/g]
      }
    });
  };