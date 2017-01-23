/**
 * betterAlexa.js
 * Author: Greg Nicholas
 * 
 * A "better" version of the alexa-sdk Lambda handler. It smoothes over a few 
 * bugs as well supports cleaner intent handling functions.
 * 
 * Intent-handling methods for a typical alexa-sdk based skill revolve around
 * performing operations on a host of implicit properties defined on `this`
 * in the method. Most of these properties aren't properly documented anywhere. 
 * Not great.
 * 
 * This wrapped version of the request handler allows us to define these 
 * intent-handling functions with a signature that includes explicit arguments
 * designed to provide most of the functionality needed. Specifically, the 
 * functions are provided the following 4 arguments:
 * 
 * - event: details about the incoming request event
 * - response: an object that allows us to build and send a response
 * - model: an object responsible for managing user state and data
 * - handlerContext: the original "this" context discussed above. only necessary
 *      if you're doing something the above 3 arguments don't provide (which is
 *      nothing in the current skill).
 * 
 * Under the hood, all of these arguments are interacting with the original 
 * "this" handler context, but you shouldn't have to worry about that when 
 * writing intent-handling functions.
 */

"use strict";

const Alexa = require('alexa-sdk');

const constants = require("./constants");
const RequestModel = require('./model');
const _ = require('lodash');

/**
 * Create the wrapped version of the standard Alexa lambda handler discussed at 
 * length above.
 */
function alexaLambdaHandler(event, context, callback) {
    const underlyingHandler = Alexa.handler(event, context, callback);

    // ensure defalt value of application state is our custom DEFAULT value
    // (this gets around a bug mentioned in `constants.js`)
    const session = underlyingHandler._event.session;
    if (session.attributes && !session.attributes[Alexa.StateString]) {
        session.attributes[Alexa.StateString] = constants.states.DEFAULT;
    }

    // define an alternate register function for defining our-style request handling functions
    Object.defineProperty(underlyingHandler, 'registerStateRouters', {
        value: function() {
            registerStateRouters.apply(underlyingHandler, arguments);
        },
        writable: false
    });

    return underlyingHandler;
}

/**
* Acts similarly to the Alexa.CreateStateHandler function, except handler 
* functions should have the (event, response, model, handlerContext) signature
* discussed above.
*/
function createStateRouter(state, actions) {
    return {
        state: state,
        actions: actions,

        decorateActions: decorateActions
    };
}

/**
* Add "request middleware" to all actions in the router.
*/
function decorateActions(decorator) {
    this.actions = _.mapValues(this.actions, action => decorator(action));
}

/**
 * Registers a list of state routers (built with `createStateRouter`)
 * with the 
 */
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

/**
 * Extracts the properties embedded in an Alexa SDK handler function's context into
 * a more useful set of objects. These are the objects sent into each action function.
 * 
 * This method is meant to be called on the Alexa SDK handler's function (that is,
 * `this` should be the `handlerContext` object defined at alexa.js:225 in alexa-sdk v1.0.4).
 * 
 * The following objects are derived from the `handlerContext`:
 * 1. event: simply the `handlerContext.event` object
 * 2. response: the `handlerContext.response` object with a few additional capabilities
 *    that allow request handling functions to send the response directly, rather than
 *    emitting events on the `handlerContext`. The idea is to mirror Express JS's style
 *    of ending requests with `res.send()`.
 * 3. model: a `RequestModel` object that provides a more domain-specific interface to
 *    the user data and state involved in this skill. This object is responsible for 
 *    managing both the handler's `attributes` and `state` properties.
 */
function extractRequestArgs() {
    // object context should be a "handleContext" defined in the Alexa SDK. See alexa.js for more.
    const handlerContext = this;

    // extend capabilities of ResponseBuilder to emit ending events itself
    Object.assign(handlerContext.response, {
        // end the request immediately, sending the response object payload
        send: function() {
            handlerContext.emit(":responseReady");
            return this;
        },
        
        // end the request immediately without sending a response object
        sendNil: function(options={}) {        // options: saveState:Boolean
            if (options.saveState) {
                // save the attributes in DynamoDB before finishing
                handlerContext.emit(":saveState", true);
            }
            else {
                // end it now, no saving
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
    alexaLambdaHandler: alexaLambdaHandler,
    createStateRouter: createStateRouter
}
