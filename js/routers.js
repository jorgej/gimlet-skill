const alexaPlus = require('./alexaPlus');
var Alexa = require('alexa-sdk');
var constants = require('./constants');

var actions = require('./actions.js')

const states = constants.states;

// TODO: use enums instead of strings for intent names
// TODO: revisit this in a way that isn't organized by state-first
var defaultIntentHandlers = alexaPlus.createRouter(states.DEFAULT, {
    /*
    *  All Intent Handlers for state : DEFAULT
    */
    'LaunchRequest': actions.launchRequest,
    'PlayLatest': actions.playLatest,
    'PlayFavorite': actions.playFavorite,
    'PlayExclusive': actions.playExclusive,

    'WhoIsMatt': actions.whoIsMatt,
    'ListShows': actions.listShows,

    'AMAZON.HelpIntent': actions.help,
    'AMAZON.PauseIntent': actions.pause,
    'AMAZON.ResumeIntent': actions.resume,
    'AMAZON.StopIntent': actions.stop,
    'AMAZON.CancelIntent': actions.cancel,
    'AMAZON.StartOverIntent': actions.startOver,

    'AMAZON.NextIntent': actions.playbackOperationUnsupported,
    'AMAZON.PreviousIntent': actions.playbackOperationUnsupported,
    'AMAZON.LoopOnIntent': actions.playbackOperationUnsupported,
    'AMAZON.LoopOffIntent': actions.playbackOperationUnsupported,
    'AMAZON.ShuffleOnIntent': actions.playbackOperationUnsupported,
    'AMAZON.ShuffleOffIntent': actions.playbackOperationUnsupported,

    'Unhandled': actions.unhandledAction,
});

var askShowIntentHandlers = alexaPlus.createRouter(states.ASK_FOR_SHOW, {
    'ShowTitleIntent': actions.showTitleNamed,
    'ListShows': actions.listShows,
    
    'AMAZON.HelpIntent': actions.help,
    
    'AMAZON.StopIntent': actions.cancel,
    'AMAZON.CancelIntent': actions.cancel,

    'Unhandled': actions.unhandledAction,

    'SessionEndedRequest': actions.sessionEnded,
});

var confirmIntentHandlers = alexaPlus.createRouter(states.QUESTION_CONFIRM, {
    'AMAZON.YesIntent': actions.resumeConfirmationYes,
    'AMAZON.NoIntent': actions.resumeConfirmationNo,

    'AMAZON.HelpIntent': actions.help,

    // TODO: include this?
    // 'AMAZON.ResumeIntent': actions.resume,
    // 'AMAZON.StartOverIntent': actions.startOver,

    'AMAZON.StopIntent': actions.cancel, // NOTE: In this case, treat this like a "cancel".
    'AMAZON.CancelIntent': actions.cancel,
    'SessionEndedRequest': actions.sessionEnded,
    'Unhandled': actions.unhandledAction
});

var whichExclusiveHandlers = alexaPlus.createRouter(states.QUESTION_EXCLUSIVE_NUMBER, {
    'NumberIntent': actions.exclusiveChosen,

    'AMAZON.HelpIntent': actions.help,
    'AMAZON.StopIntent': actions.cancel, // NOTE: In this case, treat this like a "cancel".
    'AMAZON.CancelIntent': actions.cancel,
    'SessionEndedRequest': actions.sessionEnded,
    'Unhandled': actions.unhandledAction
});

var remoteControllerHandlers = alexaPlus.createRouter(states.DEFAULT, {
    /*
        *  All Requests are received using a Remote Control. Calling corresponding handlers for each of them.
        */
    'PlayCommandIssued': actions.resume,
    'PauseCommandIssued': actions.pause,
    'NextCommandIssued': function() {
        // don't want to react at all to this command
        // TODO: check this works as intended
        this.context.succeed(true);
    },
    'PreviousCommandIssued': function() {
        // don't want to react at all to this command
        // TODO: check this works as intended
        this.context.succeed(true);
    }
});

// TODO: don't we want this for all states?
var audioEventHandlers = alexaPlus.createRouter(states.DEFAULT, {
    'PlaybackStarted': actions.playbackStarted,
    'PlaybackStopped': actions.playbackStopped,
    'PlaybackNearlyFinished': actions.playbackNearlyFinished,
    'PlaybackFinished': actions.playbackFinished,
    'PlaybackFailed': actions.playbackFailed,
});

module.exports = [
    defaultIntentHandlers,
    askShowIntentHandlers,
    confirmIntentHandlers,
    whichExclusiveHandlers,
    remoteControllerHandlers,
    audioEventHandlers
];
