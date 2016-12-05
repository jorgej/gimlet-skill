'use strict';

var Alexa = require('alexa-sdk');
var constants = require('./constants');

const handlers = require('./handlers');

// TODO: should this just be in dev?
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context);
    alexa.appId = constants.appId;
    alexa.dynamoDBTableName = constants.dynamoDBTableName;
    alexa.registerHandlers(
        handlers.startModeIntentHandlers,
        handlers.playModeIntentHandlers,
        handlers.askShowIntentHandlers,
        handlers.remoteControllerHandlers,
        handlers.audioEventHandlers
    );

    event.session.attributes["STATE"] = constants.states.START_MODE;

    if (!event.context) {
        event.context = {
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

    if (!event.context || event.context.System.device.supportedInterfaces.AudioPlayer === undefined) {
        alexa.emit(':tell', 'Sorry, this skill is not supported on this device');
    }
    else {
        alexa.execute();
    }
};
