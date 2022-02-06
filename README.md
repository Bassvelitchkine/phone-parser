# Phone Parsing

# Purpose

📱 Companies often send a lot of emails to their prospects and when they get answers, there's usually a phone number somewhere in the email. It's not too crazy to think that the phone number found in an email is the phone number of the prospect.

However, people reading those replies might forget to update the phone numbers in the CRM when they find a new one.

This Google Apps Script project is an automation that automatically parses emails received in a specific mailbox to the corresponding entities in the company's CRM.

# Code organization

## Classes

There are three _classes files_: `MailService.js`, `PhoneParser.js` and `SheetInteractions.js` and `BullHorn.js`.

In each of these files, there is a single function that **acts like a class**. A few methods are attached to each of the classes. Methods attached to MailService, for instance, only deal with the user's mailbox (Gmail for the time being). This orginization allows for **better code segmentation and clarity**.

## Variables files

There's a single variables files: `variables.js` which contains global variables required to run the project.

## Main file

This file contains only two "encapsulating" functions. These are **the functions to set a trigger for** in Google Apps Script. They're the only function the admin should worry about. It encompasses the whole project's logic.

# Installation

## Pre-Requisites

1. You have a **Bullhorn CRM** (the only CRM we're dealing with at the moment) and **GMail** mailbox.
2. (Optional) You installed [@google/clasp](https://github.com/google/clasp/) and know how to use it in your CLI.
3. You're following [this tutorial](https://spiral-sturgeon-359.notion.site/Phone-Parsing-Tutorial-efd1e3b953164d87b14954b4d59ce6a4).

## Tutorial

1. Fork this repo on your github profile and clone it into your machine.

2. In `variables.js` change the spreadsheet id to the id of the spreadsheet you duplicated:

   ```js
   return Object.freeze({
       ...
       "SPREADSHEET": {
           "spreadsheetId": "👉 Spreadsheet Id Here 👈 ",
   });
   ```

3. Still in `variables.js` add phone numbers to the list of stop phone numbers as well as regular expression for the domains to ignore:

   ```js
    return Object.freeze({
      ...,
      "PROCESSING": {
        "phoneStopList": ["+33794875467"],
        "domainStopList": [/@company.com/g]
      }
    });
   };
   ```

   Indeed, emails sent by someone from the company (emails that have a specific domain then) ought to be ignored, we won't find phone numbers of interest inside. The same goes for phone numbers. When people from the company send emails, they usually put their phone numbers in the signature. But if someone replies to that very email, we might find the phone number sent in the first place in this reply. We're not interested in it either.

4. Clasp push the code from your local repo _to the Google Apps Script project attached to the spreadsheet you just duplicated_.

# Ackowledgements

Coded with grit 💪 by [Bastien Velitchkine](https://www.linkedin.com/in/bastienvelitchkine/).
