"use strict";

const _ = require("lodash");

const authHelper = require("./authHelper");
const VoiceInsights = require('voice-insights-sdk');

module.exports = {
    auth: authDecorator,
    analytics: analyticsDecorator
};

function authDecorator(innerFn) {
    return function(event, response, model) {
        const resumeAction = innerFn.bind(this, ...arguments);
        authHelper.isSessionAuthenticated(event.session, function(auth) {
            if (auth) {
                return resumeAction();
            }
            else {
                response.speak(prompt)
                        .linkAccountCard()
                        .send();
            }
        });
    };
}

function analyticsDecorator(innerFn) {
    return function(event, response, model) {
        const resumeAction = innerFn.bind(this, ...arguments);
        let eventName, eventParams;
        if (event.request.type === 'LaunchRequest') {
            eventName = 'LaunchRequest'
            eventParams = {}
        }
        else if (event.request.type === 'IntentRequest') {
            eventName = event.request.intent.name;
            eventParams = _.pickBy(event.request.intent.slots, function(slot) {
                return _.has(slot, 'value');
            });
        }

        if (eventName) {
            VoiceInsights.track(eventName, eventParams, null, (error, response) => {
                if (error) {
                    console.error(error);
                }

                return resumeAction();
            });
        }
        else {
            return resumeAction();
        }
    };
}
