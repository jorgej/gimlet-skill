/**
 * index.js
 * Author: Greg Nicholas
 * 
 * Entry point for Lambda function execution.
 */

"use strict";

var BetterAlexa = require('./betterAlexa');
var constants = require('./constants');
var routers = require('./routers');

const VoiceInsights = require('voice-insights-sdk');

// Note: we fix this in code because development environment was breaking 
// without it. shouldn't be necessary for production
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback){
    // Similar to alexa-sdk's Alexa.handler function. See betterAlexa.js for details of 
    // the differences.
    var alexa = BetterAlexa.alexaLambdaHandler(event, context);

    alexa.appId = constants.appId;
    alexa.dynamoDBTableName = constants.dynamoDBTableName;

    // initialize analytics
    if (event.session.user) {
        // session.user won't exist for playback events, we can safely ignore these requests 
        VoiceInsights.initialize(event.session, constants.voiceInsightsToken);
    }

    // register all the action functions that will respond to intents/events
    alexa.registerStateRouters.apply(alexa, routers);

    // Uncomment to support interactions triggered from the Service Simulator
    // if (!event.context) {
    //     event.context = stubContextForSimulator(event);
    // }

    if (!event.context || event.context.System.device.supportedInterfaces.AudioPlayer === undefined) {
        alexa.emit(':tell', 'Sorry, this skill is not supported on this device');
    }
    else {
        alexa.execute();
    }
};

function stubContextForSimulator(event) {
    return {
        System: {
            application: event.session.application,
            user: event.session.user,
            device: {
                supportedInterfaces: {
                    AudioPlayer:{}
                }
            }
        }
    };
}