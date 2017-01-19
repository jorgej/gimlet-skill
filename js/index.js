'use strict';

var AlexaPlus = require('./alexaplus');
var constants = require('./constants');
var routers = require('./routers');

const VoiceInsights = require('voice-insights-sdk');

// Note: we fix this in code because development environment was breaking without it. shouldn't be necessary for productions
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback){
    var alexaPlus = AlexaPlus.client(event, context);

    alexaPlus.appId = constants.appId;
    alexaPlus.dynamoDBTableName = constants.dynamoDBTableName;

    // initialize analytics
    if (event.session.user) {
        // session.user won't exist for playback events, we can safely ignore these requests 
        VoiceInsights.initialize(event.session, constants.voiceInsightsToken);
    }

    // routers returns an array, so we use apply to pass that on
    alexaPlus.registerRouters.apply(alexaPlus, routers);

    if (!event.context) {
        // Needed for interactions triggered from the Service Simulator 
        event.context = stubContextForSimulator(event);
    }

    if (!event.context || event.context.System.device.supportedInterfaces.AudioPlayer === undefined) {
        alexaPlus.emit(':tell', 'Sorry, this skill is not supported on this device');
    }
    else {
        alexaPlus.execute();
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