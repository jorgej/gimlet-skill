'use strict';

const alexaPlus = require('./alexaPlus');
var Alexa = require('alexa-sdk');
var constants = require('./constants');
const decorators = require("./decorators");

var defaultActions = require('./defaultActions');
var dialogueActions = require('./dialogueActions');
var playbackEvents = require('./playbackEventActions');

const states = constants.states;

var defaultIntentHandlers = alexaPlus.createRouter(states.DEFAULT, {
    /*
    *  All Intent Handlers for state : DEFAULT
    */
    'LaunchRequest': decorators.auth(defaultActions.launchRequest),
    'PlayLatest': decorators.auth(defaultActions.playLatest),
    'PlayFavorite': decorators.auth(defaultActions.playFavorite),
    'PlayExclusive': decorators.auth(defaultActions.playExclusive),

    'WhoIsMatt': defaultActions.whoIsMatt,
    'ListShows': defaultActions.listShows,
    'ShowTitleIntent': defaultActions.showTitleNamed,

    'Nevermind': defaultActions.cancel,
    'NeedAssistance': defaultActions.help,

    'AMAZON.HelpIntent': defaultActions.help,

    'AMAZON.PauseIntent': defaultActions.pause,
    'AMAZON.ResumeIntent': defaultActions.resume,
    'AMAZON.StopIntent': defaultActions.stop,
    'AMAZON.CancelIntent': defaultActions.cancel,
    'AMAZON.StartOverIntent': defaultActions.startOver,

    'AMAZON.NextIntent': defaultActions.playbackOperationUnsupported,
    'AMAZON.PreviousIntent': defaultActions.playbackOperationUnsupported,
    'AMAZON.LoopOnIntent': defaultActions.playbackOperationUnsupported,
    'AMAZON.LoopOffIntent': defaultActions.playbackOperationUnsupported,
    'AMAZON.ShuffleOnIntent': defaultActions.playbackOperationUnsupported,
    'AMAZON.ShuffleOffIntent': defaultActions.playbackOperationUnsupported,

    'Unhandled': defaultActions.unhandledAction,
    'SessionEndedRequest': defaultActions.sessionEnded,
});

defaultIntentHandlers.decorateHandlers(decorators.analytics);


var askShowDialogueHandlers = alexaPlus.createRouter(states.ASK_FOR_SHOW, {
    'ListShows': dialogueActions.listShows,
    'ShowTitleIntent': dialogueActions.showTitleNamed,
    
    'Nevermind': dialogueActions.cancel,
    'NeedAssistance': dialogueActions.help,

    'AMAZON.StopIntent': dialogueActions.cancel,
    'AMAZON.CancelIntent': dialogueActions.cancel,    
    'AMAZON.HelpIntent': dialogueActions.help,
    
    'LaunchRequest': dialogueActions.launchRequest,
    'Unhandled': dialogueActions.unhandledAction,

    'SessionEndedRequest': dialogueActions.sessionEnded,
});

askShowDialogueHandlers.decorateHandlers(decorators.analytics);


var confirmDialogueHandlers = alexaPlus.createRouter(states.QUESTION_CONFIRM, {
    'AMAZON.YesIntent': dialogueActions.resumeConfirmationYes,
    'AMAZON.NoIntent': dialogueActions.resumeConfirmationNo,

    'Nevermind': dialogueActions.cancel,
    'NeedAssistance': dialogueActions.help,

    'AMAZON.StopIntent': dialogueActions.cancel, // NOTE: In this case, treat this like a "cancel".
    'AMAZON.CancelIntent': dialogueActions.cancel,
    'AMAZON.HelpIntent': dialogueActions.help,

    'LaunchRequest': dialogueActions.launchRequest,
    'SessionEndedRequest': dialogueActions.sessionEnded,
    'Unhandled': dialogueActions.unhandledAction
});

confirmDialogueHandlers.decorateHandlers(decorators.analytics);


var whichExclusiveDialogueHandlers = alexaPlus.createRouter(states.QUESTION_EXCLUSIVE_NUMBER, {
    'NumberIntent': dialogueActions.exclusiveChosen,

    'Nevermind': dialogueActions.cancel,
    'NeedAssistance': dialogueActions.help,

    'AMAZON.StopIntent': dialogueActions.cancel, // NOTE: In this case, treat this like a "cancel".
    'AMAZON.CancelIntent': dialogueActions.cancel,
    'AMAZON.HelpIntent': dialogueActions.help,
    
    'LaunchRequest': dialogueActions.launchRequest,
    'SessionEndedRequest': dialogueActions.sessionEnded,
    'Unhandled': dialogueActions.unhandledAction
});

whichExclusiveDialogueHandlers.decorateHandlers(decorators.analytics);


var remoteEventHandlers = alexaPlus.createRouter(states.DEFAULT, {
    /*
    *  All Requests are received using a Remote Control. Calling corresponding handlers for each of them.
    */
    'PlayCommandIssued': defaultActions.resume,
    'PauseCommandIssued': defaultActions.pause,
    'NextCommandIssued': function() {
        // don't want to react at all to this command
        response.sendNil({saveState: false});
    },
    'PreviousCommandIssued': function() {
        // don't want to react at all to this command
        response.sendNil({saveState: false});
    }
});

remoteEventHandlers.decorateHandlers(decorators.analytics);

// TODO: probably want to extend so they work for all states
var playbackEventHandlers = alexaPlus.createRouter(states.DEFAULT, {
    'PlaybackStarted': playbackEvents.playbackStarted,
    'PlaybackStopped': playbackEvents.playbackStopped,
    'PlaybackNearlyFinished': playbackEvents.playbackNearlyFinished,
    'PlaybackFinished': playbackEvents.playbackFinished,
    'PlaybackFailed': playbackEvents.playbackFailed,
});

module.exports = [
    defaultIntentHandlers,
    askShowDialogueHandlers,
    confirmDialogueHandlers,
    whichExclusiveDialogueHandlers,
    remoteEventHandlers,
    playbackEventHandlers
];

function decorateActions(actions, decorator) {
    // add help tracking "middleware" to all actions
    for(let key in actions) {
        actions[key] = decorator(actions[key]);
    }
}
