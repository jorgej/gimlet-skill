'use strict';

const Alexa = require('alexa-sdk');

const constants = require("./constants");
const RequestModel = require('./model');

function alexaClient(event, context, callback) {
    const underlyingHandler = Alexa.handler(event, context, callback);

    // ensure initial interaction with the skill is in default state 
    // (this gets around a bug mentioned in `constants.js`)
    if (!underlyingHandler.attributes[Alexa.StateString]) {
        underlyingHandler.attributes[Alexa.StateString] = constants.states.DEFAULT;
    }

    Object.defineProperty(underlyingHandler, 'registerRouters', {
        value: function() {
            registerRouters.apply(underlyingHandler, arguments);
        },
        writable: false
    });

    return underlyingHandler;
}

function createRouter(state, requestHandlers) {
    return {
        state: state,
        requestHandlers: requestHandlers
    };
}

// arguments are arrays of objects of AlexaRouter objects
function registerRouters() {
    for(var arg = 0; arg < arguments.length; arg++) {
        var router = arguments[arg];

        // mapping of "Alexa SDK-type" event handlers (e.g. {"AMAZON.HelpIntent": function() {...}})
        var alexaSDKEventHandlers = {};

        const eventNames = Object.keys(router.requestHandlers);
        for (var i = 0; i < eventNames.length; i++) {
            const eventName = eventNames[i];
            if(typeof(router.requestHandlers[eventName]) !== 'function') {
                throw new Error(`Request handler for '${eventName}' was not a function`);
            }

            const requestHandler = router.requestHandlers[eventName];
            alexaSDKEventHandlers[eventName] = function() {
                // here, "this" is the "handlerContext" defined in alexa.js
                [event, response, model] = extractRequestArgs.apply(this);
                requestHandler(event, response, model, this);
            };
        }

        this.registerHandlers(Alexa.CreateStateHandler(router.state, alexaSDKEventHandlers));
    }
}

function extractRequestArgs() {
    // object context should be a "handleContext" defined in the Alexa SDK. See alexa.js for more.
    const handlerContext = this;

    // extend capabilities of ResponseBuilder to emit ending events itself
    Object.assign(handlerContext.response, {
        send: function() {
            handlerContext.emit(":responseReady");
            return this;
        },
        exit: function(saveState) {
            // ends execution instead of sending alexa response
            if (saveState) {
                handlerContext.emit(":saveState", true);
            }
            else {
                handlerContext.context.succeed(true);
            }
        }
    });

    return [
        handlerContext.event,
        handlerContext.response,
        new RequestModel(handlerContext)
    ];
}

module.exports = {
    client: alexaClient,
    createRouter: createRouter
}
