'use strict';

const APP_ID = 'amzn1.ask.skill.a119fd8c-0fa9-4a9d-928d-3c4d5cc706c4';

const https = require('https');
// const alexaDateUtil = require('./alexaDateUtil');

let AlexaSkill = require('./AlexaSkill');

const EventBoard = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
EventBoard.prototype = Object.create(AlexaSkill.prototype);
EventBoard.prototype.constructor = EventBoard;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

EventBoard.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
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
        const topicSlot = intent.slots.Topic;

        if (citySlot && citySlot.value) {
            handleCityDialogueRequest(intent, session, response);
        } else if (topicSlot && topicSlot.value) {
            handleTopicDialogueRequest(intent, session, response);
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
                + 'topic to get event information, '
                + 'or you can simply open Event Board and ask a question like, '
                + 'get event information for javascript events. '
                + 'For a list of supported cities, ask what cities are supported. '
                + whichCityPrompt,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

    response.ask(speechOutput, repromptOutput);
}

function handleHelpRequest(response) {
    const repromptText = 'Which city would you like event information for?';
    const speechOutput = 'I can lead you through providing a city and '
        + 'programming skill to get event information, '
        + 'or you can simply open Event Board and ask a question like, '
        + 'get event information for Seattle on Saturday. '
        + 'For a list of supported cities, ask what cities are supported. '
        + 'Or you can say exit. '
        + repromptText;

    response.ask(speechOutput, repromptText);
}

// Handles the case where the user asked or for, or is otherwise being with supported cities
function handleSupportedCitiesRequest(intent, session, response) {
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

        speechOutput = cityZipcode.city ? 'I\'m sorry, I don\'t have any data for '
          + cityZipcode.city + '. ' + repromptText : repromptText;
        response.ask(speechOutput, repromptText);
        return;
    }

    // if we don't have a date yet, go to date. If we have a date, we perform the final request
    if (session.attributes.topic) {
        getFinalEventResponse(cityZipcode, session.attributes.topic, response);
    } else {
        // set city in session and prompt for date
        session.attributes.topic = cityZipcode;
        speechOutput = 'For which topic?';
        repromptText = 'For which topic would you like event information for in '
        + cityZipcode.city + '?';

        response.ask(speechOutput, repromptText);
    }
}

// Handles the dialog step where the user provides a date
function handleTopicDialogueRequest(intent, session, response) {
    let topic = getTopicFromIntent(intent),
        repromptText,
        speechOutput;
    if (!topic) {
        repromptText = 'Please try again saying a day of the week, for example, Saturday. '
            + 'For which date would you like event information?';
        speechOutput = 'I\'m sorry, I didn\'t understand that date. ' + repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    if (session.attributes.city) {
        getFinalEventResponse(session.attributes.city, topic, response);
    } else {
        session.attributes.topic = topic;
        speechOutput = 'For which city would you like event information for '
          + topic.displayTopic + '?';
        repromptText = 'For which city?';

        response.ask(speechOutput, repromptText);
    }
}

// Handle no slots, or slot(s) with no values.
function handleNoSlotDialogueRequest(intent, session, response) {
    if (session.attributes.city) {
        const repromptText = 'Please try again saying a programming topic like react js. ';
        const speechOutput = repromptText;

        response.ask(speechOutput, repromptText);
    } else {
        handleSupportedCitiesRequest(intent, session, response);
    }
}

function handleOneshotEventRequest(intent, session, response) {
    let cityZipcode = getCityZipcodeFromIntent(intent, true),
        repromptText,
        speechOutput;
    if (cityZipcode.error) {
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
    const topic = getTopicFromIntent(intent);
    if (!topic) {
        session.attributes.city = cityZipcode;
        repromptText = 'Please try again saying a prorgamming topic, for example, node js. '
            + 'For which date would you like event information?';
        speechOutput = 'I\'m sorry, I didn\'t understand that topic. ' + repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    getFinalEventResponse(cityZipcode, topic, response);
}

// Both the one-shot and dialog based paths lead to this method to issue the request
// they respond to the user with the final answer.
function getFinalEventResponse(cityZipcode, topic, response) {
    makeEventRequest(cityZipcode.city, topic, function eventResponseCallback(err, eventResponse) {
        let speechOutput;

        if (err) {
            speechOutput = 'Sorry, the Meetup service is experiencing a problem. Please try again later';
        } else {
          let chosenEvent = JSON.parse(eventResponse).results[0];
            speechOutput = 'I\'ve found an event. Head to ' + chosenEvent.name
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

function makeEventRequest(city, topic, eventResponseCallback) {
  //https://api.meetup.com/2/open_events?zip=10013&format=json&topic=javascript&page=20&radius=5&status=upcoming&sign=true&key=3c5b746e62d97d3766666e603140b
  const url = 'https://api.meetup.com/2/open_events';

  let zipcode = '10013'
  let programming_topic = 'javascript'

  const queryString = '?zip=' + zipcode + '&format=json&topic=' + programming_topic + '&page=20&radius=5&status=upcoming&sign=true&key=3c5b746e62d97d3766666e603140b';
  const requestUrl = url + queryString;
  console.log(requestUrl);

    const req = https.request(requestUrl, function (res) {
      let chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        const responseBody = Buffer.concat(chunks);

        eventResponseCallback(null, responseBody);
      });
    });

    req.end();
}

function getCityZipcodeFromIntent(intent) {

    const citySlot = intent.slots.City;

    if (!citySlot || !citySlot.value) {
      const repromptText = 'Which city would you like event information for?';
      const speechOutput = 'Currently, I know events information for these cities: '
        + getAllZipcodesText()
          + repromptText;

      response.ask(speechOutput, repromptText);
    } else {
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
function getTopicFromIntent(intent) {

    const topicSlot = intent.slots.Topic;
    if (!topicSlot || !topicSlot.value) {
        // default to today
        return {
            displayTopic: 'JavaScript',
            requestTopicParam: 'topic=javascript'
        }
    }
    // else {
    //
    //     const date = new Date(dateSlot.value);
    //
    //     let month = (date.getMonth() + 1);
    //     month = month < 10 ? '0' + month : month;
    //     let dayOfMonth = date.getDate();
    //     dayOfMonth = dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth;
    //     let requestDay = 'begin_date=' + date.getFullYear() + month + dayOfMonth
    //         + '&range=24';
    //
    //     return {
    //         displayDate: alexaDateUtil.getFormattedDate(date),
    //         requestDateParam: requestDay
    //     }
    // }
}

function getAllZipcodesText() {
    let zipcodeList = '';
    for (let zipcode in CITIES) {
        zipcodeList += zipcode + ', ';
    }

    return zipcodeList;
    console.log(zipcodeList);
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    const eventBoard = new EventBoard();
    eventBoard.execute(event, context);
};
