/**
 * routers.js
 * Author: Greg Nicholas
 * 
 * Sets up a series of state routers: mappings that link our code to user 
 * intents and other Alexa-initiated events. See betterAlexa.js for details
 * on these routers.
 */

"use strict";

const BetterAlexa = require('./BetterAlexa');
var constants = require('./constants');
const decorators = require("./decorators");

var mainActions = require('./mainActions');
var dialogueActions = require('./dialogueActions');
var playbackEvents = require('./playbackEventActions');

const states = constants.states;

/**
 * Routes to handle most user intents in DEFAULT state (i.e. non-question) mode.
 */
var mainIntentRouter = BetterAlexa.createStateRouter(states.DEFAULT, {
    /**
     * Protect the main intents behind an authentication challenge
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

// add analytics request middleware to these intents
mainIntentRouter.decorateActions(decorators.analytics);

/**
 * Routes for ASK_FOR_SHOW state: When the skill is asking the user to name
 * the title of a show (e.g. in response to the user saying something non-
 * specific like "Play a favorite episode")
 */
var askShowDialogueRouter = BetterAlexa.createStateRouter(states.ASK_FOR_SHOW, {
    'ListShows': dialogueActions.listShows,
    'ShowTitleIntent': dialogueActions.showTitleNamed,
    
    'Nevermind': dialogueActions.cancel,
    'NeedAssistance': dialogueActions.help,

    'AMAZON.StopIntent': dialogueActions.cancel,        // treat "Stop" like cancel when asking question
    'AMAZON.CancelIntent': dialogueActions.cancel,    
    'AMAZON.HelpIntent': dialogueActions.help,
    
    'LaunchRequest': dialogueActions.launchRequest,
    'Unhandled': dialogueActions.unhandledAction,

    'SessionEndedRequest': dialogueActions.sessionEnded,
});

// add analytics request middleware to these intents
askShowDialogueRouter.decorateActions(decorators.analytics);

/**
 * Routes for QUESTION_CONFIRM state: When the skill is asking the user a direct
 * Yes/No question. At the moment, the only time this happens is when the user
 * returns to the skill with something paused in their queue ("Would you like to 
 * resume where you left off?")
 */
var confirmDialogueRouter = BetterAlexa.createStateRouter(states.QUESTION_CONFIRM, {
    'AMAZON.YesIntent': dialogueActions.resumeConfirmationYes,
    'AMAZON.NoIntent': dialogueActions.resumeConfirmationNo,

    'Nevermind': dialogueActions.cancel,
    'NeedAssistance': dialogueActions.help,

    'AMAZON.StopIntent': dialogueActions.cancel,    // treat "Stop" like cancel when asking question
    'AMAZON.CancelIntent': dialogueActions.cancel,
    'AMAZON.HelpIntent': dialogueActions.help,

    'LaunchRequest': dialogueActions.launchRequest,
    'SessionEndedRequest': dialogueActions.sessionEnded,
    'Unhandled': dialogueActions.unhandledAction
});

// add analytics request middleware to these intents
confirmDialogueRouter.decorateActions(decorators.analytics);


/**
 * Routes for QUESTION_EXCLUSIVE_NUMBER state: When the skill is asking the 
 * user to select an item from a list of exclusive audio content. They're 
 * expected to respond with a number from the list.
 */
var whichExclusiveDialogueRouter = BetterAlexa.createStateRouter(states.QUESTION_EXCLUSIVE_NUMBER, {
    'NumberIntent': dialogueActions.exclusiveChosen,

    'Nevermind': dialogueActions.cancel,
    'NeedAssistance': dialogueActions.help,

    'AMAZON.StopIntent': dialogueActions.cancel,    // treat "Stop" like cancel when asking question
    'AMAZON.CancelIntent': dialogueActions.cancel,
    'AMAZON.HelpIntent': dialogueActions.help,
    
    'LaunchRequest': dialogueActions.launchRequest,
    'SessionEndedRequest': dialogueActions.sessionEnded,
    'Unhandled': dialogueActions.unhandledAction
});

// add analytics request middleware to these intents
whichExclusiveDialogueRouter.decorateActions(decorators.analytics);

/**
 * Handles basic play/pause/back/foward operations issues by Alexa remotes.
 */
var remoteEventRouter = BetterAlexa.createStateRouter(states.DEFAULT, {
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

// add analytics request middleware to these intents
remoteEventRouter.decorateActions(decorators.analytics);


/**
 * Handles playback notifications sent by Alexa unit to ask/notify skill
 * about playback events. We use these actions to manage our internal
 * playback state.
 */
var playbackEventRouter = BetterAlexa.createStateRouter(states.DEFAULT, {
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
