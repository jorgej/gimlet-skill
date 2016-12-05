var Alexa = require('alexa-sdk');
var constants = require('./constants');

var actions = require('./actions.js')

const states = constants.states;
const intents = constants.intents;
intents.PlayExclusive

// TODO: revisit this in a way that isn't organized by state-first
var startModeIntentHandlers = Alexa.CreateStateHandler(states.START_MODE, {
    /*
    *  All Intent Handlers for state : START_MODE
    */
    'LaunchRequest': function() { actions.launchRequest(this) },
    'PlayLatest': function() { actions.playLatest(this) },
    'PlayFavorite': function() { actions.playFav(this) },
    'PlayExclusive': function() { actions.playExclusive(this) },
    'AMAZON.HelpIntent': function() { actions.help(this) },
    'AMAZON.StopIntent': function() { actions.cancel(this) },
    'AMAZON.CancelIntent': function() { actions.cancel(this) },
    'SessionEndedRequest': function() { actions.sessionEnded(this) },
    'Unhandled': function() { actions.unhandledAction(this) },
});

// TODO: use enums instead of strings for intent names

var playModeIntentHandlers = Alexa.CreateStateHandler(states.PLAY_MODE, {
    'LaunchRequest': function() { actions.launchRequest(this) },
    'PlayLatest': function() { actions.playLatest(this) },
    'PlayFavorite': function() { actions.playFav(this) },
    'PlayExclusive': function() { actions.playExclusive(this) },
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
    
    'SessionEndedRequest': function() { actions.sessionEnded(this) },
    'Unhandled': function() { actions.unhandledAction(this) },
});

var remoteControllerHandlers = Alexa.CreateStateHandler(states.PLAY_MODE, {
    /*
        *  All Requests are received using a Remote Control. Calling corresponding handlers for each of them.
        */
    'PlayCommandIssued': function() { actions.resume(this) },
    'PauseCommandIssued': function() { actions.pause(this) },
    'NextCommandIssued': function() {
        // don't want to react at all to this command
        // TODO: check this works as intended
        this.context.success(true);
    },
    'PreviousCommandIssued': function() {
        // don't want to react at all to this command
        // TODO: check this works as intended
        this.context.success(true);
    }
});

    // resumeDecisionModeIntentHandlers : Alexa.CreateStateHandler(constants.states.RESUME_DECISION_MODE, {
    //     /*
    //      *  All Intent Handlers for state : RESUME_DECISION_MODE
    //      */
    //     'LaunchRequest' : function () {
    //         var message = 'You were listening to ' + audioData[this.attributes['playOrder'][this.attributes['index']]].title +
    //             ' Would you like to resume?';
    //         var reprompt = 'You can say yes to resume or no to play from the top.';
    //         this.response.speak(message).listen(reprompt);
    //         this.emit(':responseReady');
    //     },
    //     'AMAZON.YesIntent' : function () { controller.play.call(this) },
    //     'AMAZON.NoIntent' : function () {
    //         this.emit('LaunchRequest' + constants.states.START_MODE);
    //     },
    //     'AMAZON.HelpIntent' : function () {
    //         var message = 'You were listening to ' + audioData[this.attributes['index']].title +
    //             ' Would you like to resume?';
    //         var reprompt = 'You can say yes to resume or no to play from the top.';
    //         this.response.speak(message).listen(reprompt);
    //         this.emit(':responseReady');
    //     },
    //     'AMAZON.StopIntent' : function () {
    //         var message = 'Good bye.';
    //         this.response.speak(message);
    //         this.emit(':responseReady');
    //     },
    //     'AMAZON.CancelIntent' : function () {
    //         var message = 'Good bye.';
    //         this.response.speak(message);
    //         this.emit(':responseReady');
    //     },
    //     'SessionEndedRequest' : function () {
    //         // No session ended logic
    //     },
    //     'Unhandled' : function () {
    //         var message = 'Sorry, this is not a valid command. Please say help to hear what you can say.';
    //         this.response.speak(message).listen(message);
    //         this.emit(':responseReady');
    //     }
    // })
    // };

var audioEventHandlers = Alexa.CreateStateHandler(states.PLAY_MODE, {
    'PlaybackStarted': function() { actions.playbackStarted(this) },
    'PlaybackStopped': function() { actions.playbackStopped(this) },
    'PlaybackNearlyFinished': function() { actions.playbackNearlyFinished(this) },
    'PlaybackFinished': function() { actions.playbackFinished(this) },
    'PlaybackFailed': function() { actions.playbackFailed(this) },
});

module.exports = {
    startModeIntentHandlers: startModeIntentHandlers,
    playModeIntentHandlers: playModeIntentHandlers,
    remoteControllerHandlers: remoteControllerHandlers,
    audioEventHandlers: audioEventHandlers,
};
