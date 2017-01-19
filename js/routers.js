'use strict';

const alexaPlus = require('./alexaPlus');
var Alexa = require('alexa-sdk');
var constants = require('./constants');
const decorators = require("./decorators");

var mainActions = require('./mainActions');
var dialogueActions = require('./dialogueActions');
var playbackEvents = require('./playbackEventActions');

const states = constants.states;

var mainIntentRouter = alexaPlus.createStateRouter(states.DEFAULT, {
    /*
    *  All Intent Handlers for state : DEFAULT
    */
    'LaunchRequest': decorators.auth(mainActions.launchRequest),
    'PlayLatest': decorators.auth(mainActions.playLatest),
    'PlayFavorite': decorators.auth(mainActions.playFavorite),
    'PlayExclusive': decorators.auth(mainActions.playExclusive),

    'WhoIsMatt': mainActions.whoIsMatt,
    'ListShows': mainActions.listShows,
    'ShowTitleIntent': mainActions.showTitleNamed,

    'Nevermind': mainActions.cancel,
    'NeedAssistance': mainActions.help,

    'AMAZON.HelpIntent': mainActions.help,

    'AMAZON.PauseIntent': mainActions.pause,
    'AMAZON.ResumeIntent': mainActions.resume,
    'AMAZON.StopIntent': mainActions.stop,
    'AMAZON.CancelIntent': mainActions.cancel,
    'AMAZON.StartOverIntent': mainActions.startOver,

    'AMAZON.NextIntent': mainActions.playbackOperationUnsupported,
    'AMAZON.PreviousIntent': mainActions.playbackOperationUnsupported,
    'AMAZON.LoopOnIntent': mainActions.playbackOperationUnsupported,
    'AMAZON.LoopOffIntent': mainActions.playbackOperationUnsupported,
    'AMAZON.ShuffleOnIntent': mainActions.playbackOperationUnsupported,
    'AMAZON.ShuffleOffIntent': mainActions.playbackOperationUnsupported,

    'Unhandled': mainActions.unhandledAction,
    'SessionEndedRequest': mainActions.sessionEnded,
});

mainIntentRouter.decorateActions(decorators.analytics);


var askShowDialogueRouter = alexaPlus.createStateRouter(states.ASK_FOR_SHOW, {
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

askShowDialogueRouter.decorateActions(decorators.analytics);


var confirmDialogueRouter = alexaPlus.createStateRouter(states.QUESTION_CONFIRM, {
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

confirmDialogueRouter.decorateActions(decorators.analytics);


var whichExclusiveDialogueRouter = alexaPlus.createStateRouter(states.QUESTION_EXCLUSIVE_NUMBER, {
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

whichExclusiveDialogueRouter.decorateActions(decorators.analytics);


var remoteEventRouter = alexaPlus.createStateRouter(states.DEFAULT, {
    /*
    *  All Requests are received using a Remote Control. Calling corresponding handlers for each of them.
    */
    'PlayCommandIssued': mainActions.resume,
    'PauseCommandIssued': mainActions.pause,
    'NextCommandIssued': function() {
        // don't want to react at all to this command
        response.sendNil({saveState: false});
    },
    'PreviousCommandIssued': function() {
        // don't want to react at all to this command
        response.sendNil({saveState: false});
    }
});

remoteEventRouter.decorateActions(decorators.analytics);

// TODO: probably want to extend so they work for all states
var playbackEventRouter = alexaPlus.createStateRouter(states.DEFAULT, {
    'PlaybackStarted': playbackEvents.playbackStarted,
    'PlaybackStopped': playbackEvents.playbackStopped,
    'PlaybackNearlyFinished': playbackEvents.playbackNearlyFinished,
    'PlaybackFinished': playbackEvents.playbackFinished,
    'PlaybackFailed': playbackEvents.playbackFailed,
});

module.exports = [
    mainIntentRouter,
    askShowDialogueRouter,
    confirmDialogueRouter,
    whichExclusiveDialogueRouter,
    remoteEventRouter,
    playbackEventRouter
];

function decorateActions(actions, decorator) {
    // add help tracking "middleware" to all actions
    for(let key in actions) {
        actions[key] = decorator(actions[key]);
    }
}
