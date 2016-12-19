'use strict';

var Alexa = require('alexa-sdk');
var constants = require('./constants');

var actions = require('./actions.js')

const states = constants.states;
const intents = constants.intents;

// TODO: use enums instead of strings for intent names
// TODO: revisit this in a way that isn't organized by state-first
var defaultIntentHandlers = Alexa.CreateStateHandler(states.DEFAULT, {
    /*
    *  All Intent Handlers for state : DEFAULT
    */
    'LaunchRequest': function() { actions.launchRequest(this) },
    'PlayLatest': function() { actions.playLatest(this) },
    'PlayFavorite': function() { actions.playFavorite(this) },
    'PlayExclusive': function() { actions.playExclusive(this) },

    'WhoIsMatt': function() { actions.whoIsMatt(this) },
    'ListShows': function() { actions.listShows(this) },

    'AMAZON.HelpIntent': function() { actions.help(this) },
    'AMAZON.PauseIntent': function() { actions.pause(this) },
    'AMAZON.ResumeIntent': function() { actions.resume(this) },
    'AMAZON.StopIntent': function() { actions.stop(this) },
    'AMAZON.CancelIntent': function() { actions.cancel(this) },
    'AMAZON.StartOverIntent': function() { actions.startOver(this) },

    'AMAZON.NextIntent': function() { actions.playbackOperationUnsupported(this) },
    'AMAZON.PreviousIntent': function() { actions.playbackOperationUnsupported(this) },
    'AMAZON.LoopOnIntent': function() { actions.playbackOperationUnsupported(this) },
    'AMAZON.LoopOffIntent': function() { actions.playbackOperationUnsupported(this) },
    'AMAZON.ShuffleOnIntent': function() { actions.playbackOperationUnsupported(this) },
    'AMAZON.ShuffleOffIntent': function() { actions.playbackOperationUnsupported(this) },

    'Unhandled': function() { actions.unhandledAction(this) },
});

var askShowIntentHandlers = Alexa.CreateStateHandler(states.ASK_FOR_SHOW, {
    'ShowTitleIntent': function() { actions.showTitleNamed(this) },
    'ListShows': function() { actions.listShows(this) },
    
    'AMAZON.HelpIntent': function() { actions.help(this) },
    
    'AMAZON.StopIntent': function() { actions.cancel(this) },
    'AMAZON.CancelIntent': function() { actions.cancel(this) },

    'Unhandled': function() { actions.unhandledAction(this) },

    'SessionEndedRequest': function() { actions.sessionEnded(this) },
});

var confirmIntentHandlers = Alexa.CreateStateHandler(states.QUESTION_CONFIRM, {
    'AMAZON.YesIntent': function() { actions.resumeConfirmed(this, true) },
    'AMAZON.NoIntent': function() { actions.resumeConfirmed(this, false) },

    'AMAZON.HelpIntent': function() { actions.help(this) },

    // TODO: include this?
    // 'AMAZON.ResumeIntent': function() { actions.resume(this) },
    // 'AMAZON.StartOverIntent': function() { actions.startOver(this) },

    'AMAZON.StopIntent': function() { actions.cancel(this) }, // NOTE: In this case, treat this like a "cancel".
    'AMAZON.CancelIntent': function() { actions.cancel(this) },
    'SessionEndedRequest': function() { actions.sessionEnded(this) },
    'Unhandled': function() { actions.unhandledAction(this) }
});

var remoteControllerHandlers = Alexa.CreateStateHandler(states.DEFAULT, {
    /*
        *  All Requests are received using a Remote Control. Calling corresponding handlers for each of them.
        */
    'PlayCommandIssued': function() { actions.resume(this) },
    'PauseCommandIssued': function() { actions.pause(this) },
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
var audioEventHandlers = Alexa.CreateStateHandler(states.DEFAULT, {
    'PlaybackStarted': function() { actions.playbackStarted(this) },
    'PlaybackStopped': function() { actions.playbackStopped(this) },
    'PlaybackNearlyFinished': function() { actions.playbackNearlyFinished(this) },
    'PlaybackFinished': function() { actions.playbackFinished(this) },
    'PlaybackFailed': function() { actions.playbackFailed(this) },
});

module.exports = {
    defaultIntentHandlers: defaultIntentHandlers,
    askShowIntentHandlers: askShowIntentHandlers,
    confirmIntentHandlers: confirmIntentHandlers,
    remoteControllerHandlers: remoteControllerHandlers,
    audioEventHandlers: audioEventHandlers,
};
