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

function launchRequest(event, response, model, handlerContext) {
    // TODO: move this somewhere. auth flow here is too cluttered
    requireAuth(event, response, speaker.get("LinkAccount"), function() {
        // we can assume we're in DEFAULT state
        const controller = PlaybackController(response, model);
        let speech, reprompt;

        const track = controller.activeTrack();
        if (track) {
            transitionToState(handlerContext, appStates.QUESTION_CONFIRM, model);
            setQuestionContext(constants.questions.ConfirmResumePlayback, model);
            
            speech = speaker.askToResume(track.show);
        }
        else {
            // ensure we're in DEFAULT (should be true, but this will force us out of 
            //  state transition holes in case the logic is broken and the user is we're stuck) 
            transitionToState(handlerContext, appStates.DEFAULT, model);
            if (model.get('returningUser')) {
                speech = speaker.get("Welcome");
                reprompt = speaker.get("WhatToDo")
            }
            else {
                speech = speaker.get("NewUserWelcome");
                reprompt = speaker.get("WhatToDo")
                model.set('returningUser', true);
            }
        }

        response.speak(speech)
                .listen(reprompt || speech)
                .send();
    });
}

function help(event, response, model, handlerContext) {
    const controller = PlaybackController(response, model);

    const state = handlerContext.handler.state;
    let speech;
    let reprompt;

    let questionContext = model.get('questionContext');
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
    response.send();
}

function playLatest(event, response, model, handlerContext) {
    requireAuth(event, response, speaker.get("LinkAccount"), function() {
        const show = getShowFromSlotValue(event.request);
        if (show) {
            transitionToState(handlerContext, appStates.DEFAULT, model);
            startPlayingMostRecent(show, response, model);
        }
        else {
            let qContext = constants.questions.FavoriteShowTitle;
            transitionToState(handlerContext, appStates.ASK_FOR_SHOW, model);
            setQuestionContext(qContext, model);

            response.speak(speaker.getQuestionSpeech(qContext, "original"))
                    .listen(speaker.getQuestionSpeech(qContext, "reprompt"))
                    .send();
        }
    });
}

function playExclusive(event, response, model, handlerContext) {
    requireAuth(event, response, speaker.get("LinkAccount"), function() {
        const qContext = constants.questions.ExclusiveNumber;
        transitionToState(handlerContext, appStates.QUESTION_EXCLUSIVE_NUMBER, model);
        setQuestionContext(qContext, model);

        const excList = speaker.get("ExclusivePreamble") + 
                        speaker.get("ExclusiveList");
        const prompt = speaker.getQuestionSpeech(qContext, "original")

        response.speak(excList + prompt)
                .listen(speaker.getQuestionSpeech(qContext, "reprompt"))
                .send();
    });
}

function playFavorite(event, response, model, handlerContext) {
    requireAuth(event, response, speaker.get("LinkAccount"), function() {

        const show = getShowFromSlotValue(event.request);    
        if (show) {
            transitionToState(handlerContext, appStates.DEFAULT, model);
            startPlayingFavorite(show, response, model);
        }
        else {
            let qContext = constants.questions.FavoriteShowTitle;
            transitionToState(handlerContext, appStates.ASK_FOR_SHOW, model);
            setQuestionContext(qContext, model);

            response.speak(speaker.getQuestionSpeech(qContext, "original"))
                    .listen(speaker.getQuestionSpeech(qContext, "reprompt"))
                    .send();
        }
    });
}

function listShows(event, response, model, handlerContext) {
    let speech = speaker.get("ShowList");
    
    if (handlerContext.handler.state === appStates.ASK_FOR_SHOW) {
        const context = model.get("questionContext");
        speech += " " + speaker.getQuestionSpeech(context, 'reprompt');
        response.speak(speech)
                .listen(speaker.getQuestionSpeech(context, 'reprompt'));
    }
    else {
        response.speak(speech);
    }

    response.send();
}

function whoIsMatt(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);

    // indexes 1-30
    let mattLieberIndex = Math.ceil(Math.random() * 30);

    const speech = `<audio src="https://s3.amazonaws.com/amazon-alexa/Audio+Files/MLI/MLI+${mattLieberIndex}.mp3" />`;
    response.speak(speech).send();
}

function cancel(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);

    const controller = PlaybackController(response, model);
    if (handlerContext.handler.state === appStates.DEFAULT && controller.activeTrack()) {
        controller.stop();
    }
    else {
        response.speak(speaker.get("Goodbye"));
    }
    response.send();
}

function showTitleNamed(event, response, model, handlerContext) {
    if (handlerContext.handler.state === appStates.ASK_FOR_SHOW) {        
        if(!getShowFromSlotValue(event.request)) {
            // delegate to unhandled input handler for this state
            unhandledAction(event, response, model, handlerContext);
        }
        else {
            const questionContext = model.get("questionContext");
            
            transitionToState(handlerContext, appStates.DEFAULT, model);

            if (questionContext === constants.questions.FavoriteShowTitle) {
                playFavorite(event, response, model, handlerContext);
            }
            else { // should be MostRecentShowTitle question
                playLatest(event, response, model, handlerContext);
            }
        }
    }
    else {
        // if the user just names a show on its own, take it to mean "play the latest ..."
        transitionToState(handlerContext, appStates.DEFAULT, model);
        playLatest(event, response, model, handlerContext);
    }

    // TODO: refactor to end request here, way too easy to miss sending for a new branch
    // note: all branches above send response
}

function exclusiveChosen(event, response, model, handlerContext) {
    const number = getNumberFromSlotValue(event.request);
    const exclusive = gimlet.exclusives[number-1];
    if (exclusive) {
        transitionToState(handlerContext, appStates.DEFAULT, model);
                // Alexa only plays HTTPS urls
        response.speak(`Here is Exclusive #${number}`);

        const controller = PlaybackController(response, model);
        const track = new Track(exclusive.url, `Exclusive #${number}`);
        // TODO: replace with host mp3
        controller.start(track);
        response.send();
    }
    else {
        // defer to unhandled
        unhandledAction(event, response, model, handlerContext);
    }
}

function pause(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);

    PlaybackController(response, model).stop();
    response.send();
}

function stop(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);

    PlaybackController(response, model).stop();
    response.send();
}

function resume(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);

    const controller = PlaybackController(response, model);
    const didResume = controller.resume();    
    if (!didResume) {
        response.speak(speaker.get("EmptyQueueMessage"));
    }
    response.send();
}

function startOver(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);

    const controller = PlaybackController(response, model);
    const didRestart = controller.restart();    
    if (!didRestart) {
        response.speak(speaker.get("EmptyQueueMessage"));
    }
    response.send();
}

function resumeConfirmationYes(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);
    resume(event, response, model, handlerContext);
}

function resumeConfirmationNo(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);
    const controller = PlaybackController(response, model);
    controller.clear();

    const message = speaker.get("WhatToDo");
    response.speak(message)
            .listen(message)
            .send();
}

function playbackOperationUnsupported(event, response, model) {
    const speech = speaker.get("UnsupportedOperation");
    response.speak(speech)
            .send();
}

function playbackPlay(event, response, model) {
    PlaybackController(response, model).resume();
    response.send();
}

function playbackPause(event, response, model) {
    PlaybackController(response, model).stop();
    response.send();
}


/**
 * Lifecycle events
 */

function sessionEnded(event, response, model, handlerContext) {
    transitionToState(handlerContext, appStates.DEFAULT, model);
    response.exit(true);
}

// TODO: move logic in here into controller -- it can deal with the playback state all in its module

function playbackStarted(event, response) {
    response.exit(false);
}

function playbackStopped(event, response, model) {
    const offset = event.request.offsetInMilliseconds;
    // TODO: handle offset not being available
    PlaybackController(response, model).onPlaybackStopped(offset);
    response.exit(true);
}

function playbackNearlyFinished(event, response) {
    response.exit(false);;
}

function playbackFinished(event, response, model) {
    PlaybackController(response, model).onPlaybackFinished();
    response.exit(true);
}

function playbackFailed(event, response) {
    response.exit(false);;
}

/**
 * Misc. handlers
 */

// Not used currently. For error details: https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/custom-audioplayer-interface-reference#systemexceptionencountered-request
function systemException(event, response, model, handlerContext) {

}

function unhandledAction(event, response, model, handlerContext) {
    /* This function is triggered whenever an intent is understood by Alexa, 
        but we define no handler for it in the current application state.
    */
    if (isStateQuestion(handlerContext.handler.state)) {
        const questionContext = model.get('questionContext');
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

    response.send();
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

function startPlayingMostRecent(show, response, model) {
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
        const intro = speaker.introduceMostRecent(show);
        response.speak(intro);
        
        const controller = PlaybackController(response, model);
        const track = new Track(url, entry.title, show);
        controller.start(track);

        response.send();
    });
}

function startPlayingFavorite(show, response, model) {
    const favs = gimlet.favorites(show) || [];

    // ensure attribute exists
    if (!model.get('playbackHistory')) {
        model.set('playbackHistory', { 
            lastFavoriteIndex: {}   // map of show id: last played index
        });
    }

    // get the favorite index that was last played (default to infinity)
    const history = model.get('playbackHistory');
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

    const intro = speaker.introduceFavorite(show, fav.title);
    response.speak(intro);
    
    const controller = PlaybackController(response, model);
    const track = new Track(fav.url, fav.title, show);
    controller.start(track);

    response.send();
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
function requireAuth(event, response, prompt, successCallback) {
    authHelper.isSessionAuthenticated(event.session, function(auth) {
        if (auth) {
            successCallback();
        }
        else {
            response.speak(prompt)
                    .linkAccountCard()
                    .send();
        }
    });
}

function transitionToState(handlerContext, state, model) {
    handlerContext.handler.state = state;

    if (state === appStates.DEFAULT) {
        clearQuestionContext(model);
    }
}

function setQuestionContext(context, model) {
    model.set("questionContext", context);
}

function clearQuestionContext(model) {
    model.del("questionContext");
}
