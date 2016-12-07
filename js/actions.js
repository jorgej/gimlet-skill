'use strict';

const Say = require("./speechGenerator");
const constants = require("./constants");
const shows = require("./shows");
const PlaybackController = require("./playbackController");
const Track = require("./track");
const _ = require("lodash");

const rss = require("rss-parser");

const appStates = constants.states;
const intents = constants.intents;

function launchRequest(event) {
    // we can assume we're in DEFAULT state
    const controller = PlaybackController(event);
    let speech;
    const track = controller.activeTrack();
    if (track) {
        event.handler.state = appStates.CONFIRM_RESUME;
        speech = Say("Welcome:ConfirmResume", track.showTitle);
    }
    else {
        // ensure we're in DEFAULT (should be true, but this will force us out of 
        //  state transition holes in case the logic is broken and the user is we're stuck) 
        event.handler.state = appStates.DEFAULT;
        speech = Say("Welcome");
        // TODO: keep session alive
    }

    event.response.speak(speech)
                  .listen(speech);
    event.emit(":responseReady");
}

function help(event) {
    const controller = PlaybackController(event);

    const state = event.handler.state;
    let speech;
    let reprompt;

    if (state === appStates.DEFAULT) {
        if (controller.activeTrack()) {
            speech = Say("Help:Playback");
        }
        else {
            speech = Say("Help");
            reprompt = Say("Welcome");
        }
    }
    else if (state === appStates.ASK_FOR_SHOW) {
        speech = Say("Help:AskForShow");
        reprompt = Say("Help:AskForShow");
    }
    else if (state === appStates.CONFIRM_RESUME) {
        speech = Say("Help:ConfirmResume");
        reprompt = Say("Help:ConfirmResume");
    }
    else {
        speech = Say("_Unknown");
    }

    event.response.speak(speech);
    if (reprompt) {
        event.response.listen(reprompt);
    }
    event.emit(":responseReady");
}

function playLatest(event) {
    event.handler.state = constants.states.DEFAULT;

    const show = getShowFromSlotValue(event.event.request);
    if (show) {
        playShow(event,
            show,
            Say("PlayingLatest", show.title),
            (entries) => entries[0]
        );
    }
    else {
        event.response.speak(Say("AskForShowTitle"))
                .listen(Say("RepromptForShowTitle"));
        event.attributes["intentAskingFor"] = intents.PlayLatest;
        event.handler.state = appStates.ASK_FOR_SHOW;
        event.emit(":responseReady");
    }
}

function playExclusive(event) {
    event.handler.state = constants.states.DEFAULT;

    const show = getShowFromSlotValue(event.event.request);
    if (show) {
        playShow(event,
            show,
            Say("PlayingExclusive", show.title),
            pickRandom
        );
    }
    else {
        event.response.speak("Sorry, I don't know what show you're referring to.");
        event.response.speak(Say("AskForShowTitle"))
                .listen(Say("RepromptForShowTitle"));
        event.attributes["intentAskingFor"] = intents.PlayExclusive;
        event.handler.state = appStates.ASK_FOR_SHOW;
        
        event.emit(":responseReady");
    }
}

function playFavorite(event) {
    event.handler.state = constants.states.DEFAULT;

    const show = getShowFromSlotValue(event.event.request);    
    if (show) {
        playShow(event,
            show,
            Say("PlayingFavorite", show.title),
            pickRandom
        );
    }
    else {
        event.response.speak("Sorry, I don't know what show you're referring to.");
        event.response.speak(Say("AskForShowTitle"))
                .listen(Say("RepromptForShowTitle"));
        event.attributes["intentAskingFor"] = intents.PlayFavorite;
        event.handler.state = appStates.ASK_FOR_SHOW;
        event.emit(":responseReady");
    }
}

function listShows(event) {
    let speech = Say("ShowList");
    
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        event.response.speak(Say("ShowListThenAsk"))
                      .listen(Say("RepromptForShowTitle"));
    }
    else {
        event.response.speak(Say("ShowList"));
    }

    event.emit(":responseReady");
}

function whoIsMatt(event) {
    event.handler.state = constants.states.DEFAULT;

    event.response.speak(Say("MattLieberIs"));
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
        event.response.speak(Say("Goodbye"));
    }
    event.emit(":responseReady");
}

function showTitleNamed(event) {
    if (event.handler.state === appStates.ASK_FOR_SHOW) {
        const triggeringIntent = event.attributes["intentAskingFor"];
        delete event.attributes["intentAskingFor"];

        if(!getShowFromSlotValue(event.event.request)) {
            event.response.speak(Say("UnknownShowTitle"))
                            .listen(Say("RepromptForShowTitle"));
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
        event.response.speak(Say("EmptyQueueHelp"));
    }
    event.emit(":responseReady");
}

function startOver(event) {
    event.handler.state = constants.states.DEFAULT;

    const controller = PlaybackController(event);
    const didRestart = controller.restart();    
    if (!didRestart) {
        event.response.speak(Say("EmptyQueueHelp"));
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

        const message = Say("PromptForNewAction");
        event.response.speak(message)
                      .listen(message);
        event.emit(":responseReady");
    }
}

function playbackOperationUnsupported(event, operationName) {
    const speech = Say("UnsupportedOperation", operationName);
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
        event.response.speak(Say("UnknownShowTitle"))
                        .listen(Say("RepromptForShowTitle"));
    }
    else if (event.handler.state === appStates.CONFIRM_RESUME) {
        event.response.speak(Say("UnhandledConfirmResume"))
                      .listen(Say("UnhandledConfirmResume"));
    }
    else {
        event.response.speak(Say("_Unhandled"));
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

function playShow(event, show, introSpeech, chooseFn) {
    rss.parseURL(show.url, function(err, parsed) {
        if (err) {
            // TODO
        }

        const entry = chooseFn(parsed.feed.entries);
        if (!entry) {
            // TODO
        }

        const controller = PlaybackController(event); 

        // Alexa only plays HTTPS urls
        const url = entry.enclosure.url.replace('http://', 'https://');
        const track = new Track(url, entry.title, show.spokenTitle);

        if (introSpeech) {
            event.response.speak(introSpeech);
        }
        
        controller.start(track);
        event.emit(":responseReady");
    });
}

function getShowFromSlotValue(request) {
    const slots = request.intent.slots;
    if (slots) {
        const slot = slots["ShowTitle"];
        if (slot && slot.value) {
            const targetVal = slot.value.toLowerCase();
            return _.find(_.values(shows), s => _.includes(s.slotValues, targetVal));
        }
    }
}

function pickRandom(entries) {
    return entries[Math.floor(Math.random() * entries.length)];
}
