const Alexa = require('alexa-sdk');

function alexaClient(event, context, callback) {
    const underlyingHandler = Alexa.handler(event, context, callback);

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
                [event, response, attributes] = extractRequestArgs.apply(this);
                requestHandler(event, response, attributes, this);
            };
        }

        this.registerHandlers(Alexa.CreateStateHandler(router.state, alexaSDKEventHandlers));
    }
}

function extractRequestArgs() {
    // object context should be a "handleContext" defined in the Alexa SDK. See alexa.js for more.

    // TODO: add new response methods, transform attributes into full state store object
    return [
        this.event,
        this.response,
        this.attributes
    ]
}

module.exports = {
    client: alexaClient,
    createRouter: createRouter
}
