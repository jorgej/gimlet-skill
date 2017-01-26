/**
 * decorators.js
 * Author: Greg Nicholas
 * 
 * "Decorator" functions to be applied to action functions. Similar in spirit 
 * to Express request middleware. The decorator wraps an action in another
 * function that will do something before handing off execution to the original 
 * function.
 */

"use strict";

const _ = require("lodash");
const speaker = require("./speaker");
const authHelper = require("./authHelper");
const VoiceInsights = require('voice-insights-sdk');

module.exports = {
    auth: authDecorator,
    analytics: analyticsDecorator
};

/**
 * Decorator that ensures the user is authenticated before continuing. If auth
 * fails, the response is hijacked with a message to inform the user to link their 
 * account and the underlying action function is never called.
 */
function authDecorator(innerFn) {
    return function(event, response, model) {        
        const resumeAction = Function.apply.bind(innerFn, this, arguments);
        authHelper.isSessionAuthenticated(event.session, function(auth) {
            if (auth) {
                return resumeAction();
            }
            else {
                response.speak(speaker.get("LinkAccount"))
                        .linkAccountCard()
                        .send();
            }
        });
    };
}

/**
 * Decorator that peeks at the incoming event and reports the details to our
 * analytics service
 */
function analyticsDecorator(innerFn) {
    return function(event, response, model) {
        let eventName, eventParams;

        if (event.request.type === 'LaunchRequest') {
            eventName = 'LaunchRequest'
            eventParams = {}
        }
        else if (event.request.type === 'IntentRequest') {
            eventName = event.request.intent.name;
            eventParams = extractSlotsFromIntent(event.request.intent);
        }

        const resumeAction = Function.apply.bind(innerFn, this, arguments);
        if (eventName) {
            // if it's a trackable event, do so, and continue on when finished
            VoiceInsights.track(eventName, eventParams, null, (error, response) => {
                return resumeAction();
            });
        }
        else {
            // otherwise, just continue on
            return resumeAction();
        }
    };
}

/**
 * Helpers
 */

/**
 * Returns all slots that have non-empty values
 */
function extractSlotsFromIntent(intent) {
    return _.pickBy(intent.slots, function(slot) {
        return _.has(slot, 'value');
    });
}
