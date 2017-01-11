'use strict';

var AlexaPlus = require('./alexaplus');
var constants = require('./constants');
var routers = require('./routers');

// TODO: should this just be in dev?
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

exports.handler = function(event, context, callback){
    var alexaPlus = AlexaPlus.client(event, context);

    // in addition to all this stuff, it creates a state instance

    alexaPlus.appId = constants.appId;
    alexaPlus.dynamoDBTableName = constants.dynamoDBTableName;

    // routers returns an array, so we use apply to pass that on
    alexaPlus.registerRouters.apply(alexaPlus, routers);

    // Needed for interactions triggered from the Service Simulator 
    // if (!event.context) {
    //     event.context = {
    //         System: {
    //             application: event.session.application,
    //             user: event.session.user,
    //             device: {
    //                 supportedInterfaces: {
    //                     AudioPlayer:{}
    //                 }
    //             }
    //         }
    //     };
    // }

    if (!event.context || event.context.System.device.supportedInterfaces.AudioPlayer === undefined) {
        alexaPlus.emit(':tell', 'Sorry, this skill is not supported on this device');
    }
    else {
        alexaPlus.execute();
    }
};
