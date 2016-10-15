'use strict';

const APP_ID = 'amzn1.ask.skill.a119fd8c-0fa9-4a9d-928d-3c4d5cc706c4';

const https = require('https');
const alexaDateUtil = require('./alexaDateUtil');
// const location = require('./location');

// The AlexaSkill prototype and helper functions

let AlexaSkill = require('./AlexaSkill');

const EventBoard = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
EventBoard.prototype = Object.create(AlexaSkill.prototype);
EventBoard.prototype.constructor = EventBoard;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

EventBoard.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    // console.log('onSessionStarted requestId: ' + sessionStartedRequest.requestId
    //     + ', sessionId: ' + session.sessionId);
};

// Bind to the application launch event.
EventBoard.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
  const user = AlexaSkill.userId;
  console.log('Rachelle\'s userId: ' + user);
  handleWelcomeRequest(response);
};

// EventBoard.prototype.eventHandlers.getUser = function (userRequest, session) {
// };

EventBoard.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
};

EventBoard.prototype.intentHandlers = {
    'OneshotEventIntent': function (intent, session, response) {
        handleOneshotEventRequest(intent, session, response);
    },

    'DialogueEventIntent': function (intent, session, response) {
        const citySlot = intent.slots.City;
        const dateSlot = intent.slots.Date;

        if (citySlot && citySlot.value) {
            handleCityDialogueRequest(intent, session, response);
        } else if (dateSlot && dateSlot.value) {
            handleDateDialogueRequest(intent, session, response);
        } else {
            handleNoSlotDialogueRequest(intent, session, response);
        }
    },

    'SupportedCitiesIntent': function (intent, session, response) {
        handleSupportedCitiesRequest(intent, session, response);
    },

    'AMAZON.HelpIntent': function (intent, session, response) {
        handleHelpRequest(response);
    },

    'AMAZON.StopIntent': function (intent, session, response) {
        const speechOutput = 'Goodbye';
        response.tell(speechOutput);
    },

    'AMAZON.CancelIntent': function (intent, session, response) {
        const speechOutput = 'Goodbye';
        response.tell(speechOutput);
    }
};

const CITIES = {
  'seattle': 98104,
  'san francisco': 94015,
  'phoenix': 85003,
  'new york': 10013,
  'fort collins': 80524,
  'denver': 80202,
  'boulder': 80302,
  'austin': 78701
};

function handleWelcomeRequest(response) {
    const whichCityPrompt = 'Which city would you like event information for?',
        speechOutput = {
            speech: '<speak>Welcome to Event Board. '
                + whichCityPrompt
                + '</speak>',
            type: AlexaSkill.speechOutputType.SSML
        },
        repromptOutput = {
            speech: 'I can lead you through providing a city and '
                + 'day of the week to get event information, '
                + 'or you can simply open Event Board and ask a question like, '
                + 'get event information for Seattle on Saturday. '
                + 'For a list of supported cities, ask what cities are supported. '
                + whichCityPrompt,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

    response.ask(speechOutput, repromptOutput);
}

function handleHelpRequest(response) {
    const repromptText = 'Which city would you like event information for?';
    const speechOutput = 'I can lead you through providing a city and '
        + 'day of the week to get event information, '
        + 'or you can simply open Event Board and ask a question like, '
        + 'get event information for Seattle on Saturday. '
        + 'For a list of supported cities, ask what cities are supported. '
        + 'Or you can say exit. '
        + repromptText;

    response.ask(speechOutput, repromptText);
}

// Handles the case where the user asked or for, or is otherwise being with supported cities
function handleSupportedCitiesRequest(intent, session, response) {
    // get city re-prompt
    const repromptText = 'Which city would you like event information for?';
    const speechOutput = 'Currently, I know events information for these cities: '
      + getAllZipcodesText()
        + repromptText;

    response.ask(speechOutput, repromptText);
}

// Handles the dialog step where the user provides a city
function handleCityDialogueRequest(intent, session, response) {

    let cityZipcode = getCityZipcodeFromIntent(intent, false),
        repromptText,
        speechOutput;
    if (cityZipcode.error) {
        repromptText = 'Currently, I know event information for these cities: '
          + getAllZipcodesText()
            + 'Which city would you like event information for?';
        // if we received a value for the incorrect city, repeat it to the user,
        // otherwise we received an empty slot
        speechOutput = cityZipcode.city ? 'I\'m sorry, I don\'t have any data for '
          + cityZipcode.city + '. ' + repromptText : repromptText;
        response.ask(speechOutput, repromptText);
        return;
    }

    // if we don't have a date yet, go to date. If we have a date, we perform the final request
    if (session.attributes.date) {
        getFinalEventResponse(cityZipcode, session.attributes.date, response);
    } else {
        // set city in session and prompt for date
        session.attributes.city = cityZipcode;
        speechOutput = 'For which date?';
        repromptText = 'For which date would you like event information for '
          + cityZipcode.city + '?';

        response.ask(speechOutput, repromptText);
    }
}

// Handles the dialog step where the user provides a date
function handleDateDialogueRequest(intent, session, response) {
    // console.log('handleDateDialogueRequest: Began execution');
    let date = getDateFromIntent(intent),
        repromptText,
        speechOutput;
    if (!date) {
        // console.log('handleDateDialogueRequest: Date hasn\'t been set, so asking '
        //   + ' for date.');
        repromptText = 'Please try again saying a day of the week, for example, Saturday. '
            + 'For which date would you like event information?';
        speechOutput = 'I\'m sorry, I didn\'t understand that date. ' + repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    // if we don't have a city yet, go to city. If we have a city, we perform the final request
    if (session.attributes.city) {
        getFinalEventResponse(session.attributes.city, date, response);
    } else {
        // The user provided a date out of turn. Set date in session and prompt for city
        session.attributes.date = date;
        speechOutput = 'For which city would you like event information for '
          + date.displayDate + '?';
        repromptText = 'For which city?';

        response.ask(speechOutput, repromptText);
    }
}

// Handle no slots, or slot(s) with no values.
function handleNoSlotDialogueRequest(intent, session, response) {
    if (session.attributes.city) {
        // get date re-prompt
        const repromptText = 'Please try again saying a day of the week, for example, Saturday. ';
        const speechOutput = repromptText;

        response.ask(speechOutput, repromptText);
    } else {
        // get city re-prompt
        handleSupportedCitiesRequest(intent, session, response);
    }
}

function handleOneshotEventRequest(intent, session, response) {

    // Determine city, using default if none provided
    let cityZipcode = getCityZipcodeFromIntent(intent, true),
        repromptText,
        speechOutput;
    if (cityZipcode.error) {
        // invalid city. move to the dialogue
        repromptText = 'Currently, I know event information for these cities: '
          + getAllZipcodesText()
            + 'Which city would you like event information for?';
        // if we received a value for the incorrect city, repeat it to the user, otherwise we received an empty slot
        speechOutput = cityZipcode.city ? 'I\'m sorry, I don\'t have any data for '
          + cityZipcode.city + '. ' + repromptText : repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    // Determine custom date
    const date = getDateFromIntent(intent);
    if (!date) {
        // Invalid date. set city in session and prompt for date
        session.attributes.city = cityZipcode;
        repromptText = 'Please try again saying a day of the week, for example, Saturday. '
            + 'For which date would you like event information?';
        speechOutput = 'I\'m sorry, I didn\'t understand that date. ' + repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    // all slots filled, either from the user or by default values. Move to final request
    getFinalEventResponse(cityZipcode, date, response);
}

// Both the one-shot and dialog based paths lead to this method to issue the request
// they respond to the user with the final answer.
function getFinalEventResponse(cityZipcode, date, response) {
    // Issue the request, and respond to the user
    makeEventRequest(cityZipcode.city, date, function eventResponseCallback(err, eventResponse) {
        let speechOutput;

        if (err) {
            speechOutput = 'Sorry, the Meetup service is experiencing a problem. Please try again later';
        } else {
          // console.log('eventResponseCallback: response argument - ' + eventResponse);

          let chosenEvent = JSON.parse(eventResponse).results[0];
          // console.log('eventResponseCallback: make event request' + chosenEvent);
            speechOutput = 'I\'ve found an event. Head to ' + chosenEvent.name
                  // + ' at ' + chosenEvent.time
                  + ' at ' + utcToLocalTime(chosenEvent.time)
                  + ' on ' + utcToLocalDate(chosenEvent.time);
        }

        response.tellWithCard(speechOutput, 'EventBoard', speechOutput);
    });
}

function utcToLocalDate(epochTime){
  let future = new Date(1476752400000);
  const convertFutureDate = future.toLocaleDateString().toString();

  return convertFutureDate;

}

function utcToLocalTime(epochTime){
  let future = new Date(1476752400000);
  const convertFutureTime = future.toLocaleTimeString().toString();

  return convertFutureTime;
}

function makeEventRequest(city, date, eventResponseCallback) {
  //https://api.meetup.com/2/open_events?zip=10013&format=json&topic=javascript&page=20&radius=5&status=upcoming&sign=true&key=3c5b746e62d97d3766666e603140b
  const url = 'https://api.meetup.com/2/open_events';

  let zipcode = '10013'
  let topic = 'javascript'

  const queryString = '?zip=' + zipcode + '&format=json&topic=' + topic + '&page=20&radius=5&status=upcoming&sign=true&key=3c5b746e62d97d3766666e603140b';
  const requestUrl = url + queryString;
  console.log(requestUrl);

    // const url = 'https://api.meetup.com/2/open_events';
    // const topic = 'javascript'
    // const queryString = '?' + 'zip=98119&and_text=False&offset=0&city=' + city.toLowerCase()
    //   + '&format=json&limited_events=False&topic=' + topic + '&photo-host=public&page=20&radius=5 '
    //   + '&desc=False&status=upcoming&sig_id=211406069&sig=9d796cdae277e6882d092574eb0cb74c3bca0539';
    // const requestUrl = url + queryString;

    // console.log('makeEventRequest: making request to '+ requestUrl);
    const req = https.request(requestUrl, function (res) {
      let chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        const responseBody = Buffer.concat(chunks);
        // console.log('makeEventRequest: response recieved - '+ responseBody);

        eventResponseCallback(null, responseBody);
      });
    });

    req.end();
}

// location((location) => {
//   if(!location) {
//     console.log('Unable to guess locaiton');
//     return;
//   }
//   console.log('city: ' + location.city);
//   console.log('log/lat: ' + location.loc);
// });

// Gets the city from the intent, or returns an error
// need function start below if we plan to keep a default city
// function getCityZipcodeFromIntent(intent, assignDefault) {
function getCityZipcodeFromIntent(intent) {

    const citySlot = intent.slots.City;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    // if (!citySlot || !citySlot.value) {
    //     if (!assignDefault) {
    //         return {
    //             error: true
    //         }
    //     } else {
    //         // For sample skill, default to Seattle.
    //         return {
    //             city: 'seattle',
    //             zipcode: CITIES.seattle
    //         }
    //     }
    if (!citySlot || !citySlot.value) {
      const repromptText = 'Which city would you like event information for?';
      const speechOutput = 'Currently, I know events information for these cities: '
        + getAllZipcodesText()
          + repromptText;

      response.ask(speechOutput, repromptText);
    } else {
        // lookup the city. Sample skill uses well known mapping of a few known
        // cities to zipcode id.
        const cityName = citySlot.value;
        if (CITIES[cityName.toLowerCase()]) {
            return {
                city: cityName,
                zipcode: CITIES[cityName.toLowerCase()]
            }
        } else {
            return {
                error: true,
                city: cityName
            }
        }
    }
}

// Gets the date from the intent, defaulting to today if none provided,
// or returns an error
function getDateFromIntent(intent) {

    const dateSlot = intent.slots.Date;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!dateSlot || !dateSlot.value) {
        // default to today
        return {
            displayDate: 'Today',
            requestDateParam: 'date=today'
        }
    } else {

        const date = new Date(dateSlot.value);

        // format the request date like YYYYMMDD
        let month = (date.getMonth() + 1);
        month = month < 10 ? '0' + month : month;
        let dayOfMonth = date.getDate();
        dayOfMonth = dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth;
        let requestDay = 'begin_date=' + date.getFullYear() + month + dayOfMonth
            + '&range=24';

        return {
            displayDate: alexaDateUtil.getFormattedDate(date),
            requestDateParam: requestDay
        }
    }
}

function getAllZipcodesText() {
    let zipcodeList = '';
    for (var zipcode in CITIES) {
        zipcodeList += zipcode + ', ';
    }

    return zipcodeList;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    const eventBoard = new EventBoard();
    eventBoard.execute(event, context);
};
