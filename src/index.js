'use strict';

const APP_ID = 'amzn1.ask.skill.ea1a009f-1de9-4a35-b6ba-f3bb6c968f11';

const https = require('https');
const http = require('http');
const alexaDateUtil = require('./alexaDateUtil');
let AlexaSkill = require('./AlexaSkill');

const TechEvents = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
TechEvents.prototype = Object.create(AlexaSkill.prototype);
TechEvents.prototype.constructor = TechEvents;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

TechEvents.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log('onSessionStarted requestId: ' + sessionStartedRequest.requestId
        + ', sessionId: ' + session.sessionId);
};

TechEvents.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log('onLaunch requestId: ' + launchRequest.requestId + ', sessionId: ' + session.sessionId);
    handleWelcomeRequest(response);
};

TechEvents.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log('onSessionEnded requestId: ' + sessionEndedRequest.requestId
        + ', sessionId: ' + session.sessionId);
};

/**
 * override intentHandlers to map intent handling functions.
 */
TechEvents.prototype.intentHandlers = {
    'OneshotEventIntent': function (intent, session, response) {
        handleOneShotEventRequest(intent, session, response);
    },

    'DialogTideIntent': function (intent, session, response) {
        // Determine if this turn is for city, for date, or an error.
        // We could be passed slots with values, no slots, slots with no value.
        const citySlot = intent.slots.City;
        const dateSlot = intent.slots.Date;
        if (citySlot && citySlot.value) {
            handleCityDialogRequest(intent, session, response);
        }
        // else if (dateSlot && dateSlot.value) {
        //     handleDateDialogRequest(intent, session, response);
        // }
        else {
            handleNoSlotDialogRequest(intent, session, response);
        }
    },
    'GetCity': function () {
        const parentofthis = this;
        getCityWhereEventsAreHappening(parentofthis);
    },
    'SupportedCitiesIntent': function (intent, session, response) {
        handleSupportedCitiesRequest(intent, session, response);
    },

    'AMAZON.HelpIntent': function (intent, session, response) {
        handleHelpRequest(response);
    },

    'AMAZON.StopIntent': function (intent, session, response) {
        var speechOutput = 'Goodbye';
        response.tell(speechOutput);
    },

    'AMAZON.CancelIntent': function (intent, session, response) {
        var speechOutput = 'Goodbye';
        response.tell(speechOutput);
    }
};

// -------------------------- TidePooler Domain Specific Business Logic --------------------------

// example city to NOAA station mapping. Can be found on: http://tidesandcurrents.noaa.gov/map/
// QUERIES BREAK WHEN THIS OBJECT IS REMOVED
var CITIES = {
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
    const whichCityPrompt = 'Which city would you like event information for? '
          + ' Currently I have information for ' + getAllStationsText(),
        speechOutput = {
            speech: '<speak>Welcome to Tech Events. How can I help you? '
                + '</speak>',
            type: AlexaSkill.speechOutputType.SSML
        },
        repromptOutput = {
            speech: 'I can lead you through providing a city '
                + ' or you can simply open Tech Events and ask a question like, '
                + ' get information for the next event near me.'
                + ' For a list of supported cities, ask what cities are supported. '
                + whichCityPrompt,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

    response.ask(speechOutput, repromptOutput);
}

function handleHelpRequest(response) {
    const repromptText = 'Which city would you like tide information for?';
    const speechOutput = 'I can lead you through providing a city '
        + ' or you can simply open Tech Events and ask a question like, '
        + ' get information for the next event near me.'
        + ' For a list of supported cities, ask what cities are supported. '
        + ' Or you can say exit. '
        + repromptText;

    response.ask(speechOutput, repromptText);
}

/**
 * Handles the case where the user asked or for, or is otherwise being with supported cities
 */
function handleSupportedCitiesRequest(intent, session, response) {
    // get city re-prompt
    const repromptText = 'Which city would you like event information for?';
    const speechOutput = 'Currently, I know event information for these cities: '
      + getAllStationsText()
      + repromptText;

    response.ask(speechOutput, repromptText);
}

/**
 * Handles the dialog step where the user provides a city
 */
function handleCityDialogRequest(intent, session, response) {

    let cityStation = getCityIdFromIntent(intent, false),
        repromptText,
        speechOutput;
    if (cityStation.error) {
        repromptText = 'Currently, I know tide information for these coastal cities: '
          + getAllStationsText() + 'Which city would you like tide information for?';
        // if we received a value for the incorrect city, repeat it to the user, otherwise we received an empty slot
        speechOutput = 'I\'m sorry I don\'t have information for that city.';
        response.ask(speechOutput, repromptText);
        return;
    }

    // if we don't have a date yet, go to date. If we have a date, we perform the final request
    // if (session.attributes.date) {
    //     getFinalEventResponse(cityStation, session.attributes.date, response);
    // } else {
    //     // set city in session and prompt for date
    //     session.attributes.city = cityStation;
    //     speechOutput = "For which date?";
    //     repromptText = "For which date would you like tide information for " + cityStation.city + "?";
    //
    //     response.ask(speechOutput, repromptText);
    // }
}

/**
 * Handles the dialog step where the user provides a date
 */
// function handleDateDialogRequest(intent, session, response) {
//
//     var date = getDateFromIntent(intent),
//         repromptText,
//         speechOutput;
//     if (!date) {
//         repromptText = "Please try again saying a day of the week, for example, Saturday. "
//             + "For which date would you like tide information?";
//         speechOutput = "I'm sorry, I didn't understand that date. " + repromptText;
//
//         response.ask(speechOutput, repromptText);
//         return;
//     }
//
//     // if we don't have a city yet, go to city. If we have a city, we perform the final request
//     if (session.attributes.city) {
//         getFinalEventResponse(session.attributes.city, date, response);
//     } else {
//         // The user provided a date out of turn. Set date in session and prompt for city
//         session.attributes.date = date;
//         speechOutput = "For which city would you like tide information for " + date.displayDate + "?";
//         repromptText = "For which city?";
//
//         response.ask(speechOutput, repromptText);
//     }
// }

/**
 * Handle no slots, or slot(s) with no values.
 * In the case of a dialog based skill with multiple slots,
 * when passed a slot with no value, we cannot have confidence
 * it is the correct slot type so we rely on session state to
 * determine the next turn in the dialog, and reprompt.
 */
function handleNoSlotDialogRequest(intent, session, response) {
    if (session.attributes.city) {
        // get date re-prompt
        var repromptText = 'Please try again saying a day of the week, for example, Saturday. ';
        var speechOutput = repromptText;

        response.ask(speechOutput, repromptText);
    } else {
        // get city re-prompt
        handleSupportedCitiesRequest(intent, session, response);
    }
}

/**
 * This handles the one-shot interaction, where the user utters a phrase like:
 * 'Alexa, open Tech Events and get event information for Seattle on Saturday'.
 * If there is an error in a slot, this will guide the user to the dialog approach.
 */
function handleOneShotEventRequest(intent, session, response) {

    // Determine city, using default if none provided
    let cityStation = getCityIdFromIntent(intent, true),
        repromptText,
        speechOutput;
    if (cityStation.error) {
        // invalid city. move to the dialog
        repromptText = 'Currently, I know event information for these cities: '
          + getAllStationsText() + 'Which city would you like tide information for?';
        // if we received a value for the incorrect city, repeat it to the user, otherwise we received an empty slot
        speechOutput = cityStation.city ? 'I\'m sorry, I don\'t have any data for '
        + cityStation.city + '. ' + repromptText : repromptText;

        response.ask(speechOutput, repromptText);
        return;
    }

    // Determine custom date
    const date = getDateFromIntent(intent);
    // if (!date) {
    //     // Invalid date. set city in session and prompt for date
    //     session.attributes.city = cityStation;
    //     // repromptText = "Please try again saying a day of the week, for example, Saturday. "
    //     //     + "For which date would you like tide information?";
    //     // speechOutput = "I'm sorry, I didn't understand that date. " + repromptText;
    //     //
    //     // response.ask(speechOutput, repromptText);
    //     // return;
    // }

    // all slots filled, either from the user or by default values. Move to final request
    getFinalEventResponse(cityStation, date, response);
}

/**
 * Both the one-shot and dialog based paths lead to this method to issue the request, and
 * respond to the user with the final answer.
 */
function getFinalEventResponse(cityStation, date, response) {

    // Issue the request, and respond to the user
    makeTideRequest(cityStation.station, date, function tideResponseCallback(err, highTideResponse) {
        var speechOutput;

        if (err) {
            speechOutput = 'Sorry, the Meet Up Service is being a fucking pain in the ass. Too bad for you.';
        } else {
            speechOutput = 'Sorry, I don\'t know why I asked you what I could help you with because I am extremely ducking useless right now. I can\'t even say ducking mother ducker.';
        }

        response.tellWithCard(speechOutput, 'TechEvents', speechOutput)
    });
}

function getCityWhereEventsAreHappening(parentofthis, callback) {

  const url = 'https://api.meetup.com/2/open_events';
  const city = 'seattle';
  const topic = 'javascript'
  const queryString = '?' + 'zip=98119&and_text=False&offset=0&city=' + city + '&format=json&limited_events=False&topic=' + topic + '&photo-host=public&page=20&radius=5&desc=False&status=upcoming&sig_id=211406069&sig=9d796cdae277e6882d092574eb0cb74c3bca0539';
  const endpoint = url + queryString;

  var req = https.request(endpoint, function (res) {
    var chunks = [];

    res.on("data", function (chunk) {
      chunks.push(chunk);
    });

    res.on("end", function () {
      var body = Buffer.concat(chunks);
      console.log(JSON.stringify(JSON.parse(body.toString()), null, 2));
      // parentofthis.emit(':tell', 'Goodbye!');
    });
  });

  req.end();
}

getCityWhereEventsAreHappening();


function makeTideRequest(station, date, tideResponseCallback) {

  // var url = 'https://odn.data.socrata.com/resource/kx62-ayme.json';
  // var queryString = '?' + '$where=value%20%3E%2027';
  // var endpoint = url + queryString;

    var datum = "MLLW";
    var endpoint = 'http://tidesandcurrents.noaa.gov/api/datagetter';
    var queryString = '?' + date.requestDateParam;
    queryString += '&station=' + station;
    queryString += '&product=predictions&datum=' + datum + '&units=english&time_zone=lst_ldt&format=json';

    http.get(endpoint + queryString, function (res) {
        var noaaResponseString = '';
        console.log('Status Code: ' + res.statusCode);

        if (res.statusCode != 200) {
            tideResponseCallback(new Error("Non 200 Response"));
        }

        res.on('data', function (data) {
            noaaResponseString += data;
        });

        res.on('end', function () {
            var noaaResponseObject = JSON.parse(noaaResponseString);

            if (noaaResponseObject.error) {
                console.log("NOAA error: " + noaaResponseObj.error.message);
                tideResponseCallback(new Error(noaaResponseObj.error.message));
            } else {
                var highTide = findHighTide(noaaResponseObject);
                tideResponseCallback(null, highTide);
            }
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        tideResponseCallback(new Error(e.message));
    });
}

/**
 * Algorithm to find the 2 high tides for the day, the first of which is smaller and occurs
 * mid-day, the second of which is larger and typically in the evening
 */
function findHighTide(noaaResponseObj) {
  console.log(6);
}

/**
 * Gets the city from the intent, or returns an error
 */
function getCityIdFromIntent(intent, assignDefault) {

    const citySlot = intent.slots.City;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!citySlot || !citySlot.value) {
        if (!assignDefault) {
            return {
                error: true
            }
        } else {
            // For sample skill, default to Seattle.
            return {
                city: 'seattle',
                station: CITIES.seattle
            }
        }
    } else {
        // lookup the city. Sample skill uses well known mapping of a few known cities to station id.
        const cityName = citySlot.value;
        if (CITIES[cityName.toLowerCase()]) {
            return {
                city: cityName,
                station: CITIES[cityName.toLowerCase()]
            }
        } else {
            return {
                error: true,
                city: cityName
            }
        }
    }
}

/**
 * Gets the date from the intent, defaulting to today if none provided,
 * or returns an error
 */
 // BREAKS CODE IF REMOVED
function getDateFromIntent(intent) {

    const dateSlot = intent.slots.Date;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!dateSlot || !dateSlot.value) {
        // default to today
        return {
            displayDate: "Today",
            requestDateParam: "date=today"
        }
    } else {

        var date = new Date(dateSlot.value);

        // format the request date like YYYYMMDD
        var month = (date.getMonth() + 1);
        month = month < 10 ? '0' + month : month;
        var dayOfMonth = date.getDate();
        dayOfMonth = dayOfMonth < 10 ? '0' + dayOfMonth : dayOfMonth;
        var requestDay = "begin_date=" + date.getFullYear() + month + dayOfMonth
            + "&range=24";

        return {
            displayDate: alexaDateUtil.getFormattedDate(date),
            requestDateParam: requestDay
        }
    }
}

function getAllStationsText() {
    var stationList = '';
    for (var station in CITIES) {
        stationList += station + ", ";
    }

    return stationList;
}

exports.handler = function (event, context) {
    var techEvents = new TechEvents();
    techEvents.execute(event, context);
};
