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
            event.handler.state = appStates.CONFIRM_RESUME;
            speech = speaker.askToResume(track.show);
        }
        else {
            // ensure we're in DEFAULT (should be true, but this will force us out of 
            //  state transition holes in case the logic is broken and the user is we're stuck) 
            event.handler.state = appStates.DEFAULT;
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

    if (state === appStates.DEFAULT) {
        if (controller.activeTrack()) {
            speech = speaker.get("Help:Playback");
        }
        else {
            speech = speaker.get("Help");
            reprompt = speaker.get("Welcome");
        }
    }
    else if (state === appStates.ASK_FOR_SHOW) {
        speech = speaker.get("Help:AskForShow");
        reprompt = speaker.get("Help:AskForShow");
    }
    else if (state === appStates.CONFIRM_RESUME) {
        speech = speaker.get("Help:ConfirmResume");
        reprompt = speaker.get("Help:ConfirmResume");
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
        event.handler.state = constants.states.DEFAULT;

        const show = getShowFromSlotValue(event.event.request);
        if (show) {
            playMostRecent(event, show);
        }
        else {
            event.response.speak(speaker.get("AskForShowTitle"))
                    .listen(speaker.get("RepromptForShowTitle"));
            event.attributes["intentAskingFor"] = intents.PlayLatest;
            event.handler.state = appStates.ASK_FOR_SHOW;
            event.emit(":responseReady");
        }
    });
}

function playExclusive(event) {
    requireAuth(event, speaker.get("NotAuthorized"), function() {
        event.handler.state = constants.states.DEFAULT;

        // TODO: figure out how to play show

        const show = getShowFromSlotValue(event.event.request);
        if (show) {
            playExclusive(event, show);
        }
        else {
            event.response.speak("Sorry, I don't know what show you're referring to.");
            event.response.speak(speaker.get("AskForShowTitle"))
                    .listen(speaker.get("RepromptForShowTitle"));
            event.attributes["intentAskingFor"] = intents.PlayExclusive;
            event.handler.state = appStates.ASK_FOR_SHOW;
            
            event.emit(":responseReady");
        }
    });
}

function playFavorite(event) {
    requireAuth(event, speaker.get("NotAuthorized"), function() {
        event.handler.state = constants.states.DEFAULT;

        const show = getShowFromSlotValue(event.event.request);    
        if (show) {
            playFavorite(event, show);
        }
        else {
            event.response.speak("Sorry, I don't know what show you're referring to.");
            event.response.speak(speaker.get("AskForShowTitle"))
                    .listen(speaker.get("RepromptForShowTitle"));
            event.attributes["intentAskingFor"] = intents.PlayFavorite;
            event.handler.state = appStates.ASK_FOR_SHOW;
            event.emit(":responseReady");
        }
    });
}

function listShows(event) {
    let speech = speaker.get("ShowList");
    
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        event.response.speak(speaker.get("ShowListThenAsk"))
                      .listen(speaker.get("RepromptForShowTitle"));
    }
    else {
        event.response.speak(speaker.get("ShowList"));
    }

    event.emit(":responseReady");
}

function whoIsMatt(event) {
    event.handler.state = constants.states.DEFAULT;

    event.response.speak(speaker.get("MattLieberIs"));
    event.emit(":responseReady");
}

function cancel(event) {
    event.handler.state = constants.states.DEFAULT;

    const controller = PlaybackController(event);
    if (event.handler.state === appStates.DEFAULT && controller.activeTrack()) {
        PlaybackController(event).stop();
    }
    else {
        event.handler.state = appStates.DEFAULT;
        event.response.speak(speaker.get("Goodbye"));
    }
    event.emit(":responseReady");
}

function showTitleNamed(event) {
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        const triggeringIntent = event.attributes["intentAskingFor"];
        delete event.attributes["intentAskingFor"];

        if(!getShowFromSlotValue(event.event.request)) {
            event.response.speak(speaker.get("UnknownShowTitle"))
                            .listen(speaker.get("RepromptForShowTitle"));
        }
        else {
            event.handler.state = appStates.DEFAULT;
            if (triggeringIntent === intents.PlayFavorite) {
                playFavorite(event);
            }
            else if (triggeringIntent === intents.PlayExclusive) {
                playExclusive(event);
            }
            else {  // should be PlayLatest
                playLatest(event);
            }
            return;
        }
    }
    else {
        // if the user just names a show on its own, take it to mean "play the latest ..."
        event.handler.state = appStates.DEFAULT;
        playLatest(event);
        return;        
    }

    event.emit(":responseReady");
}

function pause(event) {
    event.handler.state = constants.states.DEFAULT;

    PlaybackController(event).stop();
    event.emit(":responseReady");
}

function stop(event) {
    event.handler.state = constants.states.DEFAULT;

    PlaybackController(event).stop();
    event.emit(":responseReady");
}

function resume(event) {
    event.handler.state = constants.states.DEFAULT;

    const controller = PlaybackController(event);
    const didResume = controller.resume();    
    if (!didResume) {
        event.response.speak(speaker.get("EmptyQueueHelp"));
    }
    event.emit(":responseReady");
}

function startOver(event) {
    event.handler.state = constants.states.DEFAULT;

    const controller = PlaybackController(event);
    const didRestart = controller.restart();    
    if (!didRestart) {
        event.response.speak(speaker.get("EmptyQueueHelp"));
    }
    event.emit(":responseReady");
}

function resumeConfirmed(event, shouldResume) {
    event.handler.state = appStates.DEFAULT;

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
    event.handler.state = appStates.DEFAULT;
    event.emit(":saveState", true);
    // TODO: implement
    // if (event.handler.state === appStates.ASK_FOR_SHOW) {
    //     event.handler.state = appStates.DEFAULT;
    //     delete event.attributes["intentAskingFor"];
    //     event.emit(":saveState");
    // }
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
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        event.response.speak(speaker.get("UnknownShowTitle"))
                        .listen(speaker.get("RepromptForShowTitle"));
    }
    else if (event.handler.state === appStates.CONFIRM_RESUME) {
        event.response.speak(speaker.get("UnhandledConfirmResume"))
                      .listen(speaker.get("UnhandledConfirmResume"));
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

function playMostRecent(event, show) {
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

function playExclusive(event, show) {
    // TODO
    event.response.speak("Sorry, this feature is not yet implemented");
}

function playFavorite(event, show) {
    const favs = gimlet.favorites(show) || [];

    const url = favs[0] && favs[0].url;
    if (!url) {
        // TODO
    }

    // Alexa only plays HTTPS urls
    const track = new Track(url, entry.title, show);
    playTrack(event, track, speaker.introduceFavorite(show));
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
