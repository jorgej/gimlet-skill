'use strict';

const Alexa = require('alexa-sdk');

const constants = require("./constants");
const RequestModel = require('./model');
const _ = require('lodash');

function alexaClient(event, context, callback) {
    const underlyingHandler = Alexa.handler(event, context, callback);

    // ensure defalt value of application state is our custom DEFAULT value
    // (this gets around a bug mentioned in `constants.js`)
    const session = underlyingHandler._event.session;
    if (session.attributes && !session.attributes[Alexa.StateString]) {
        session.attributes[Alexa.StateString] = constants.states.DEFAULT;
    }

    Object.defineProperty(underlyingHandler, 'registerStateRouters', {
        value: function() {
            registerStateRouters.apply(underlyingHandler, arguments);
        },
        writable: false
    });

    return underlyingHandler;
}

function createStateRouter(state, actions) {
    return {
        state: state,
        actions: actions,

        decorateActions: function(decorator) {
            _.mapValues(this.actions, action => decorator(action));
        }
    };
}

// arguments are arrays of objects of AlexaRouter objects
function registerStateRouters() {
    for(var arg = 0; arg < arguments.length; arg++) {
        var router = arguments[arg];

        // mapping of "Alexa SDK-type" event handlers (e.g. {"AMAZON.HelpIntent": function() {...}})
        var alexaSDKEventHandlers = {};

        const eventNames = Object.keys(router.actions);
        for (var i = 0; i < eventNames.length; i++) {
            const eventName = eventNames[i];
            if(typeof(router.actions[eventName]) !== 'function') {
                throw new Error(`Request handler for '${eventName}' was not a function`);
            }

            const action = router.actions[eventName];
            alexaSDKEventHandlers[eventName] = function() {
                // here, "this" is the "handlerContext" defined in alexa.js
                const [event, response, model] = extractRequestArgs.apply(this);
                action(event, response, model, this);
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
        sendNil: function(options={}) {        // options: saveState:Boolean
            // ends execution instead of sending alexa response
            if (options.saveState) {
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
    createStateRouter: createStateRouter
}
