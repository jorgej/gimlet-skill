module.exports = {
    helpTracking: helpTrackingDecorator,
    auth: authDecorator,
    analytics: analyticsDecorator
};

function helpTrackingDecorator(innerFn) {
    const resumeAction = innerFn.bind(this, ...arguments);
    return function(event, response, model) {
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
    const resumeAction = innerFn.bind(this, ...arguments);
    return function(event, response, model) {
        // TODO
        return resumeAction();
    };
}