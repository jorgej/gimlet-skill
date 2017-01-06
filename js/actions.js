'use strict';

const speaker = require("./speaker");
const constants = require("./constants");
const gimlet = require("./gimlet");
const PlaybackController = require("./playbackController");
const Track = require("./track");
const authHelper = require("./authHelper");

const rss = require("rss-parser");
const _ = require("lodash");

const appStates = constants.states;
const intents = constants.intents;

function launchRequest(event, response, attributes, handlerContext) {
    // TODO: move this somewhere. auth flow here is too cluttered
    requireAuth(handlerContext, speaker.get("LinkAccount"), function() {
        // we can assume we're in DEFAULT state
        const controller = PlaybackController(handlerContext);
        let speech, reprompt;

        const track = controller.activeTrack();
        if (track) {
            transitionToState(handlerContext, appStates.QUESTION_CONFIRM, {
                questionContext: constants.questions.ConfirmResumePlayback
            });
            
            speech = speaker.askToResume(track.show);
        }
        else {
            // ensure we're in DEFAULT (should be true, but this will force us out of 
            //  state transition holes in case the logic is broken and the user is we're stuck) 
            transitionToState(handlerContext, appStates.DEFAULT);
            if (attributes['returningUser']) {
                speech = speaker.get("Welcome");
                reprompt = speaker.get("WhatToDo")
            }
            else {
                speech = speaker.get("NewUserWelcome");
                reprompt = speaker.get("WhatToDo")
                attributes['returningUser'] = true;
            }
        }

        response.speak(speech)
                .listen(reprompt || speech);
        handlerContext.emit(":responseReady");
    });
}

function help(event, response, attributes, handlerContext) {
    const controller = PlaybackController(handlerContext);

    const state = handlerContext.handler.state;
    let speech;
    let reprompt;

    let questionContext = attributes['questionContext'];
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
    else if (isStateQuestion(state)) {
        speech = speaker.getQuestionSpeech(questionContext, 'help');
        reprompt = speaker.getQuestionSpeech(questionContext, 'reprompt');
    }
    else {
        speech = speaker.get("_Unknown");
    }

    response.speak(speech);
    if (reprompt) {
        response.listen(reprompt);
    }
    handlerContext.emit(":responseReady");
}

function playLatest(event, response, attributes, handlerContext) {
    requireAuth(handlerContext, speaker.get("LinkAccount"), function() {
        const show = getShowFromSlotValue(event.request);
        if (show) {
            transitionToState(handlerContext, appStates.DEFAULT);
            startPlayingMostRecent(handlerContext, show);
        }
        else {
            let context = constants.questions.FavoriteShowTitle;
            transitionToState(handlerContext, appStates.ASK_FOR_SHOW, {questionContext: context});

            response.speak(speaker.getQuestionSpeech(context, "original"))
                    .listen(speaker.getQuestionSpeech(context, "reprompt"));
            handlerContext.emit(":responseReady");
        }
    });
}

function playExclusive(event, response, attributes, handlerContext) {
    requireAuth(handlerContext, speaker.get("LinkAccount"), function() {
        const context = constants.questions.ExclusiveNumber;
        transitionToState(handlerContext, appStates.QUESTION_EXCLUSIVE_NUMBER, {questionContext: context});

        const excList = speaker.get("ExclusivePreamble") + 
                        speaker.get("ExclusiveList");
        const prompt = speaker.getQuestionSpeech(context, "original")

        response.speak(excList + prompt)
                .listen(speaker.getQuestionSpeech(context, "reprompt"));
        handlerContext.emit(":responseReady");
    });
}

function playFavorite(event, response, attributes, handlerContext) {
    requireAuth(handlerContext, speaker.get("LinkAccount"), function() {

        const show = getShowFromSlotValue(event.request);    
        if (show) {
            transitionToState(handlerContext, appStates.DEFAULT);
            startPlayingFavorite(handlerContext, show);
        }
        else {
            let context = constants.questions.FavoriteShowTitle;
            transitionToState(handlerContext, appStates.ASK_FOR_SHOW, {questionContext: context});

            response.speak(speaker.getQuestionSpeech(context, "original"))
                    .listen(speaker.getQuestionSpeech(context, "reprompt"));

            handlerContext.emit(":responseReady");
        }
    });
}

function listShows(event, response, attributes, handlerContext) {
    let speech = speaker.get("ShowList");
    
    if (handlerContext.handler.state === appStates.ASK_FOR_SHOW) {
        const context = attributes["questionContext"];
        speech += " " + speaker.getQuestionSpeech(context, 'reprompt');
        response.speak(speech)
                .listen(speaker.getQuestionSpeech(context, 'reprompt'));
    }
    else {
        response.speak(speech);
    }

    handlerContext.emit(":responseReady");
}

function whoIsMatt(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);

    // indexes 1-30
    let mattLieberIndex = Math.ceil(Math.random() * 30);

    const speech = `<audio src="https://s3.amazonaws.com/amazon-alexa/Audio+Files/MLI/MLI+${mattLieberIndex}.mp3" />`;
    response.speak(speech);
    handlerContext.emit(":responseReady");
}

function cancel(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);

    const controller = PlaybackController(handlerContext);
    if (handlerContext.handler.state === appStates.DEFAULT && controller.activeTrack()) {
        PlaybackController(handlerContext).stop();
    }
    else {
        response.speak(speaker.get("Goodbye"));
    }
    handlerContext.emit(":responseReady");
}

function showTitleNamed(event, response, attributes, handlerContext) {
    if (handlerContext.handler.state === appStates.ASK_FOR_SHOW) {        
        if(!getShowFromSlotValue(event.request)) {
            // delegate to unhandled input handler for this state
            unhandledAction(event, response, attributes, handlerContext);
        }
        else {
            const questionContext = attributes["questionContext"];
            
            transitionToState(handlerContext, appStates.DEFAULT);

            if (questionContext === constants.questions.FavoriteShowTitle) {
                playFavorite(event, response, attributes, handlerContext);
            }
            else { // should be MostRecentShowTitle question
                playLatest(event, response, attributes, handlerContext);
            }
            return;
        }
    }
    else {
        // if the user just names a show on its own, take it to mean "play the latest ..."
        transitionToState(handlerContext, appStates.DEFAULT);
        playLatest(event);
        return;        
    }

    handlerContext.emit(":responseReady");
}

function exclusiveChosen(event, response, attributes, handlerContext) {
    const number = getNumberFromSlotValue(event.request);
    const exclusive = gimlet.exclusives[number-1];
    if (exclusive) {
        transitionToState(handlerContext, appStates.DEFAULT);
                // Alexa only plays HTTPS urls
        const track = new Track(exclusive.url, `Exclusive #${number}`);
        playTrack(handlerContext, track, `Here is Exclusive #${number}`);
    }
    else {
        // defer to unhandled
        unhandledAction(event, response, attributes, handlerContext);
    }
}

function pause(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);

    PlaybackController(handlerContext).stop();
    handlerContext.emit(":responseReady");
}

function stop(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);

    PlaybackController(handlerContext).stop();
    handlerContext.emit(":responseReady");
}

function resume(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);

    const controller = PlaybackController(handlerContext);
    const didResume = controller.resume();    
    if (!didResume) {
        response.speak(speaker.get("EmptyQueueMessage"));
    }
    handlerContext.emit(":responseReady");
}

function startOver(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);

    const controller = PlaybackController(handlerContext);
    const didRestart = controller.restart();    
    if (!didRestart) {
        response.speak(speaker.get("EmptyQueueMessage"));
    }
    handlerContext.emit(":responseReady");
}

function resumeConfirmationYes(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);
    resume(event, response, attributes, handlerContext);
}

function resumeConfirmationNo(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);
    const controller = PlaybackController(handlerContext);
    controller.clear();

    const message = speaker.get("WhatToDo");
    response.speak(message)
            .listen(message);
    handlerContext.emit(":responseReady");
}

function playbackOperationUnsupported(event, response, attributes, handlerContext) {
    const speech = speaker.get("UnsupportedOperation");
    response.speak(speech);
    handlerContext.emit(":responseReady");
}

function playbackPlay(event, response, attributes, handlerContext) {
    PlaybackController(handlerContext).resume();
    handlerContext.emit(":responseReady");
}

function playbackPause(event, response, attributes, handlerContext) {
    PlaybackController(handlerContext).stop();
    handlerContext.emit(":responseReady");
}


/**
 * Lifecycle events
 */

function sessionEnded(event, response, attributes, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT);
    handlerContext.emit(":saveState", true);
}

// TODO: move logic in here into controller -- it can deal with the playback state all in its module

function playbackStarted(event, response, attributes, handlerContext) {
    handlerContext.context.succeed(true);
}

function playbackStopped(event, response, attributes, handlerContext) {
    const offset = event.request.offsetInMilliseconds;
    // TODO: handle offset not being available
    PlaybackController(handlerContext).onPlaybackStopped(offset);
    handlerContext.emit(':saveState', true);
}

function playbackNearlyFinished(event, response, attributes, handlerContext) {
    handlerContext.context.succeed(true);
}

function playbackFinished(event, response, attributes, handlerContext) {
    PlaybackController(handlerContext).onPlaybackFinished();
    handlerContext.emit(':saveState', true);
}

function playbackFailed(event, response, attributes, handlerContext) {
    handlerContext.context.succeed(true);
}

/**
 * Misc. handlers
 */

// Not used currently. For error details: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-audioplayer-interface-reference#systemexceptionencountered-request
function systemException(event, response, attributes, handlerContext) {

}

function unhandledAction(event, response, attributes, handlerContext) {
    /* This function is triggered whenever an intent is understood by Alexa, 
        but we define no handler for it in the current application state.
    */
    if (isStateQuestion(handlerContext.handler.state)) {
        const questionContext = attributes['questionContext'];
        if (!questionContext) {
            // TODO: what to do if this is broken?
        }
        
        const speech = speaker.getQuestionSpeech(questionContext, 'unhandled');
        const reprompt = speaker.getQuestionSpeech(questionContext, 'reprompt');

        response.speak(speech)
                .listen(reprompt);
    }
    else {
        response.speak(speaker.get("_Unhandled"))
                .listen(speaker.get("WhatToDo"));
    }

    handlerContext.emit(':responseReady');
}

module.exports = {
    launchRequest: launchRequest,

    playLatest: playLatest,
    playExclusive: playExclusive,
    playFavorite: playFavorite,
    listShows: listShows,
    whoIsMatt: whoIsMatt,
    showTitleNamed: showTitleNamed,
    exclusiveChosen: exclusiveChosen,

    help: help,
    cancel: cancel,
    
    pause: pause,
    stop: stop,
    resume: resume,
    playbackOperationUnsupported: playbackOperationUnsupported,
    startOver: startOver,
    resumeConfirmationYes: resumeConfirmationYes,
    resumeConfirmationNo: resumeConfirmationNo,
    playbackPlay: playbackPlay,
    playbackPause: playbackPause,

    sessionEnded: sessionEnded,
    playbackStarted: playbackStarted,
    playbackStopped: playbackStopped,
    playbackNearlyFinished: playbackNearlyFinished,
    playbackFinished: playbackFinished,
    playbackFailed: playbackFailed,

    unhandledAction: unhandledAction,
};

/**
 * Helpers
 */

function isStateQuestion(state) {
    return _.includes([appStates.ASK_FOR_SHOW, appStates.QUESTION_CONFIRM, appStates.QUESTION_EXCLUSIVE_NUMBER], 
                        state);
}

function startPlayingMostRecent(handlerContext, show) {
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
        playTrack(handlerContext, track, speaker.introduceMostRecent(show));
    });
}

function startPlayingFavorite(handlerContext, show) {
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
    playTrack(handlerContext, track, speaker.introduceFavorite(show, fav.title));
}

function playTrack(handlerContext, track, introSpeech) {
    const controller = PlaybackController(handlerContext); 

    if (introSpeech) {
        handlerContext.response.speak(introSpeech);
    }
    
    controller.start(track);
    handlerContext.emit(":responseReady");
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

function getNumberFromSlotValue(request) {
    const slot = request.intent.slots["Number"];
    if (slot && slot.value !== undefined) {
        return Number(slot.value);
    }
}

// TODO: make into middleware
function requireAuth(handlerContext, prompt, successCallback) {
    authHelper.isSessionAuthenticated(handlerContext.event.session, function(auth) {
        if (auth) {
            successCallback();
        }
        else {
            handlerContext.response.speak(prompt).linkAccountCard();
            handlerContext.emit(":responseReady");
        }
    });
}

function transitionToState(handlerContext, state, associatedAttrs) {
    handlerContext.handler.state = state;
    Object.assign(handlerContext.attributes, associatedAttrs);
    if (state === appStates.DEFAULT) {
        delete handlerContext.attributes["questionContext"];
    }
}
