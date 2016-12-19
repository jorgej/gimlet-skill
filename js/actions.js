'use strict';

const speaker = require("./speaker");
const constants = require("./constants");
const gimlet = require("./gimlet");
const PlaybackController = require("./playbackController");
const Track = require("./track");
const authHelper = require("./authHelper");

const rss = require("rss-parser");

const appStates = constants.states;
const intents = constants.intents;

function launchRequest(event) {
    // TODO: move this somewhere. auth flow here is too cluttered
    requireAuth(event, speaker.get("Welcome:NotAuthorized"), function() {
        // we can assume we're in DEFAULT state
        const controller = PlaybackController(event);
        let speech, reprompt;

        const track = controller.activeTrack();
        if (track) {
            event.handler.state = appStates.QUESTION_CONFIRM;
            speech = speaker.askToResume(track.show);
        }
        else {
            // ensure we're in DEFAULT (should be true, but this will force us out of 
            //  state transition holes in case the logic is broken and the user is we're stuck) 
            transitionToState(event, appStates.DEFAULT);
            if (event.attributes['returningUser']) {
                speech = speaker.get("Welcome");
                reprompt = speaker.get("PromptForNewAction")
            }
            else {
                speech = speaker.get("Welcome:FirstTime");
                reprompt = speaker.get("PromptForNewAction")
                event.attributes['returningUser'] = true;
            }
        }

        event.response.speak(speech)
                      .listen(reprompt || speech);
        event.emit(":responseReady");
    });
}

function help(event) {
    const controller = PlaybackController(event);

    const state = event.handler.state;
    let speech;
    let reprompt;

    let questionContext = event.attributes['questionContext'];
    if (!questionContext) {
        // TODO: handle missing question context    
    }

    if (state === appStates.DEFAULT) {
        if (controller.activeTrack()) {
            speech = speaker.get("Help:Playback");
        }
        else {
            speech = speaker.get("Help");
            reprompt = speaker.get("Welcome");
        }
    }
    else if (state === appStates.ASK_FOR_SHOW || state === appStates.QUESTION_CONFIRM) {
        speech = speaker.getQuestionSpeech(questionContext, 'help');
        reprompt = speaker.getQuestionSpeech(questionContext, 'reprompt');
    }
    else {
        speech = speaker.get("_Unknown");
    }

    event.response.speak(speech);
    if (reprompt) {
        event.response.listen(reprompt);
    }
    event.emit(":responseReady");
}

function playLatest(event) {
    requireAuth(event, speaker.get("NotAuthorized"), function() {
        const show = getShowFromSlotValue(event.event.request);
        if (show) {
            transitionToState(event, appStates.DEFAULT);
            startPlayingMostRecent(event, show);
        }
        else {
            let context = constants.questions.FavoriteShowTitle;
            transitionToState(event, appStates.ASK_FOR_SHOW, {questionContext: context});

            event.response.speak(speaker.getQuestionSpeech(context, "original"))
                          .listen(speaker.getQuestionSpeech(context, "reprompt"));
            event.emit(":responseReady");
        }
    });
}

function playExclusive(event) {
    requireAuth(event, speaker.get("NotAuthorized"), function() {
        transitionToState(event, appStates.DEFAULT);
        event.response.speak("Sorry, I can't handle that intent yet")
        event.emit(":responseReady");
    });
}

function playFavorite(event) {
    requireAuth(event, speaker.get("NotAuthorized"), function() {

        const show = getShowFromSlotValue(event.event.request);    
        if (show) {
            transitionToState(event, appStates.DEFAULT);
            startPlayingFavorite(event, show);
        }
        else {
            let context = constants.questions.FavoriteShowTitle;
            transitionToState(event, appStates.ASK_FOR_SHOW, {questionContext: context});

            event.response.speak(speaker.getQuestionSpeech(context, "original"))
                          .listen(speaker.getQuestionSpeech(context, "reprompt"));

            event.emit(":responseReady");
        }
    });
}

function listShows(event) {
    let speech = speaker.get("ShowList");
    
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        const context = event.attributes["questionContext"];
        speech += " " + speaker.getQuestionSpeech(context, 'reprompt');
        event.response.speak(speech + " " + speaker.getQuestionSpeech(context, 'reprompt'))
                      .listen(speaker.getQuestionSpeech(context, 'reprompt'));
    }
    else {
        event.response.speak(speech);
    }

    event.emit(":responseReady");
}

function whoIsMatt(event) {
    transitionToState(event, appStates.DEFAULT);

    // indexes 1-30
    let mattLieberIndex = Math.ceil(Math.random() * 30);

    const speech = `<audio src="https://s3.amazonaws.com/amazon-alexa/Audio+Files/MLI/MLI+${mattLieberIndex}.mp3" />`;
    event.response.speak(speech);
    event.emit(":responseReady");
}

function cancel(event) {
    transitionToState(event, appStates.DEFAULT);

    const controller = PlaybackController(event);
    if (event.handler.state === appStates.DEFAULT && controller.activeTrack()) {
        PlaybackController(event).stop();
    }
    else {
        event.response.speak(speaker.get("Goodbye"));
    }
    event.emit(":responseReady");
}

function showTitleNamed(event) {
    if (event.handler.state === appStates.ASK_FOR_SHOW) {        
        if(!getShowFromSlotValue(event.event.request)) {
            // delegate to unhandled input handler for this state
            unhandledAction(event);
        }
        else {
            const questionContext = event.attributes["questionContext"];
            
            transitionToState(event, appStates.DEFAULT);

            if (questionContext === constants.questions.FavoriteShowTitle) {
                playFavorite(event);
            }
            else { // should be MostRecentShowTitle question
                playLatest(event);
            }
            return;
        }
    }
    else {
        // if the user just names a show on its own, take it to mean "play the latest ..."
        transitionToState(event, appStates.DEFAULT);
        playLatest(event);
        return;        
    }

    event.emit(":responseReady");
}

function pause(event) {
    transitionToState(event, appStates.DEFAULT);

    PlaybackController(event).stop();
    event.emit(":responseReady");
}

function stop(event) {
    transitionToState(event, appStates.DEFAULT);

    PlaybackController(event).stop();
    event.emit(":responseReady");
}

function resume(event) {
    transitionToState(event, appStates.DEFAULT);

    const controller = PlaybackController(event);
    const didResume = controller.resume();    
    if (!didResume) {
        event.response.speak(speaker.get("EmptyQueueHelp"));
    }
    event.emit(":responseReady");
}

function startOver(event) {
    transitionToState(event, appStates.DEFAULT);

    const controller = PlaybackController(event);
    const didRestart = controller.restart();    
    if (!didRestart) {
        event.response.speak(speaker.get("EmptyQueueHelp"));
    }
    event.emit(":responseReady");
}

function resumeConfirmed(event, shouldResume) {
    transitionToState(event, appStates.DEFAULT);

    if (shouldResume) {
        resume(event);
    }
    else {
        const controller = PlaybackController(event);
        controller.clear();

        const message = speaker.get("PromptForNewAction");
        event.response.speak(message)
                      .listen(message);
        event.emit(":responseReady");
    }
}

function playbackOperationUnsupported(event, operationName) {
    const speech = speaker.get("UnsupportedOperation", operationName);
    event.response.speak(speech);
    event.emit(":responseReady");
}

function playbackPlay(event) {
    PlaybackController(event).resume();
    event.emit(":responseReady");
}

function playbackPause(event) {
    PlaybackController(event).stop();
    event.emit(":responseReady");
}


/**
 * Lifecycle events
 */

function sessionEnded(event) {
    transitionToState(event, appStates.DEFAULT);
    event.emit(":saveState", true);
}

// TODO: move logic in here into controller -- it can deal with the playback state all in its module

function playbackStarted(event) {
    event.context.succeed(true);
}

function playbackStopped(event) {
    const offset = event.event.request.offsetInMilliseconds;
    // TODO: handle offset not being available
    PlaybackController(event).onPlaybackStopped(offset);
    event.emit(':saveState', true);
}

function playbackNearlyFinished(event) {
    event.context.succeed(true);
}

function playbackFinished(event) {
    PlaybackController(event).onPlaybackFinished();
    event.emit(':saveState', true);
}

function playbackFailed(event) {
    event.context.succeed(true);
}

/**
 * Misc. handlers
 */

// For error details: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-audioplayer-interface-reference#systemexceptionencountered-request
function systemException(event, err) {

}

function unhandledAction(event) {
    /* This function is triggered whenever an intent is understood by Alexa, 
        but we define no handler for it in the current application state.
    */
    if (event.handler.state === appStates.ASK_FOR_SHOW || event.handler.state === appStates.QUESTION_CONFIRM) {
        const questionContext = event.attributes['questionContext'];
        if (!questionContext) {
            // TODO: what to do if this is broken?
        }
        
        const speech = speaker.getQuestionSpeech(questionContext, 'unhandled');
        const reprompt = speaker.getQuestionSpeech(questionContext, 'reprompt');

        event.response.speak(speech)
                      .listen(reprompt);
    }
    else {
        event.response.speak(speaker.get("_Unhandled"));
    }

    event.emit(':responseReady');
}

module.exports = {
    launchRequest: launchRequest,

    playLatest: playLatest,
    playExclusive: playExclusive,
    playFavorite: playFavorite,
    listShows: listShows,
    whoIsMatt: whoIsMatt,
    showTitleNamed: showTitleNamed,

    help: help,
    cancel: cancel,
    
    pause: pause,
    stop: stop,
    resume: resume,
    playbackOperationUnsupported: playbackOperationUnsupported,
    startOver: startOver,
    resumeConfirmed: resumeConfirmed,
    playbackPlay: playbackPlay,
    playbackPause: playbackPause,

    sessionEnded: sessionEnded,
    playbackStarted: playbackStarted,
    playbackStopped: playbackStopped,
    playbackNearlyFinished: playbackNearlyFinished,
    playbackFinished: playbackFinished,
    playbackFailed: playbackFailed,

    systemException: systemException,
    unhandledAction: unhandledAction,
};

/**
 * Helpers
 */

function startPlayingMostRecent(event, show) {
    const url = gimlet.feedUrl(show);
    rss.parseURL(url, function(err, parsed) {
        if (err) {
            // TODO
        }

        const entry = parsed.feed.entries[0];
        if (!entry) {
            // TODO
        }

        // Alexa only plays HTTPS urls
        const url = entry.enclosure.url.replace('http://', 'https://');
        const track = new Track(url, entry.title, show);
        playTrack(event, track, speaker.introduceMostRecent(show));
    });
}

function startPlayingExclusive(event, show) {
    // TODO
    event.response.speak("Sorry, this feature is not yet implemented");
}

function startPlayingFavorite(event, show) {
    const favs = gimlet.favorites(show) || [];

    // ensure attribute exists
    if (!event.attributes['playbackHistory']) {
        event.attributes['playbackHistory'] = { 
            lastFavoriteIndex: {}   // map of show id: last played index
        }
    }


    // get the favorite index that was last played (default to infinity)
    const history = event.attributes['playbackHistory'];
    let lastPlayedIndex = history.lastFavoriteIndex[show.id];
    if (lastPlayedIndex === undefined) {
        lastPlayedIndex = Infinity;
    }

    // next index is either 1 + last, or cycled back down to 0
    const nextIndex = (lastPlayedIndex < favs.length-1) ? 
                        lastPlayedIndex + 1 :
                        0;
    
    let fav = favs[nextIndex];
    if (!fav) {
        // TODO
    }

    history.lastFavoriteIndex[show.id] = nextIndex;

    const track = new Track(fav.url, fav.title, show);
    playTrack(event, track, speaker.introduceFavorite(show, fav.title));
}

function playTrack(event, track, introSpeech) {
    const controller = PlaybackController(event); 

    if (introSpeech) {
        event.response.speak(introSpeech);
    }
    
    controller.start(track);
    event.emit(":responseReady");
}

function getShowFromSlotValue(request) {
    const slots = request.intent.slots;
    if (slots) {
        const slot = slots["ShowTitle"];
        if (slot && slot.value) {
            return gimlet.showMatchingSlotValue(slot.value);
        }
    }
}

function requireAuth(event, prompt, successCallback) {
    successCallback();
    return;
    authHelper.isSessionAuthenticated(event.event.session, function(auth) {
        if (auth) {
            successCallback();
        }
        else {
            event.response.speak(prompt).linkAccountCard();
            event.emit(":responseReady");
        }
    });
}

function transitionToState(event, state, associatedAttrs) {
    event.handler.state = state;
    Object.assign(event.attributes, associatedAttrs);
    if (state === appStates.DEFAULT) {
        delete event.attributes["questionContext"];
    }
}