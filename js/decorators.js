
const _ = require("lodash");

const authHelper = require("./authHelper");
const constants = require("./constants");
const VoiceInsights = require('voice-insights-sdk');

module.exports = {
    helpTracking: helpTrackingDecorator,
    auth: authDecorator,
    analytics: analyticsDecorator
};

function helpTrackingDecorator(innerFn) {
    return function(event, response, model) {
        const resumeAction = innerFn.bind(this, ...arguments);
        if (event.request.type === "IntentRequest") {
            // only mess with the help counter if it's an intent request
            let helpCount = model.getAttr("helpCtr") || 0;
            const intentName = event.request.intent && event.request.intent.name;
            if (intentName === "AMAZON.HelpIntent") {
                helpCount++;
            }
            else {
                helpCount = 0;
            }
            model.setAttr("helpCtr", helpCount);
        }
        return resumeAction();
    };
}

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
                return resumeAction();
            });
        }
        else {
            return resumeAction();
        }
    };
}
