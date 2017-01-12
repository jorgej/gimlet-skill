'use strict';

const speaker = require("./speaker");
const constants = require("./constants");
const gimlet = require("./gimlet");
const Track = require("./track");
const authHelper = require("./authHelper");

const rss = require("rss-parser");
const _ = require("lodash");
const fs = require("fs");

const appStates = constants.states;

function launchRequest(event, response, model) {
    // TODO: move this somewhere. auth flow here is too cluttered
    requireAuth(event, response, speaker.get("LinkAccount"), function() {
        // we can assume we're in DEFAULT state
        let speech, reprompt;

        const currentTrack = model.getPlaybackState().track;
        if (currentTrack && !model.isPlaybackIdle()) {
            // if there's a track already enqueued, and it's not idle 
            //  (i.e. hasn't completed), we ask if the user want to continue playback
            model.enterQuestionMode(constants.questions.ConfirmResumePlayback);
            speech = speaker.askToResume(currentTrack.showId);
        }
        else {
            // ensure we're in DEFAULT (should be true, but this will force us out of 
            //  state transition holes in case the logic is broken and the user is we're stuck) 
            model.exitQuestionMode();
            if (model.getAttr('returningUser')) {
                speech = speaker.get("Welcome");
                reprompt = speaker.get("WhatToDo")
            }
            else {
                speech = speaker.get("NewUserWelcome");
                reprompt = speaker.get("WhatToDo")
                model.setAttr('returningUser', true);
            }
        }

        response.speak(speech)
                .listen(reprompt || speech)
                .send();
    });
}

function help(event, response, model) {
    let speech;
    let reprompt;

    let activeQuestion = model.getActiveQuestion();
    if (!activeQuestion) {
        if (model.isPlaybackIdle()) {
            speech = speaker.get("Help");
            reprompt = speaker.get("WhatToDo");
        }
        else {
            speech = speaker.get("Help:Playback");
        }
    }
    else {
        speech = speaker.getQuestionSpeech(activeQuestion, 'help');
        reprompt = speaker.getQuestionSpeech(activeQuestion, 'reprompt');
    }

    response.speak(speech);
    if (reprompt) {
        response.listen(reprompt);
    }
    response.send();
}

function playLatest(event, response, model) {
    requireAuth(event, response, speaker.get("LinkAccount"), function() {
        const show = getShowFromSlotValue(event.request);
        if (show) {
            model.exitQuestionMode();
            startPlayingMostRecent(show, response, model);
        }
        else {
            let activeQuestion = constants.questions.FavoriteShowTitle;
            model.enterQuestionMode(activeQuestion);

            response.speak(speaker.getQuestionSpeech(activeQuestion, "original"))
                    .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
                    .send();
        }
    });
}

function playExclusive(event, response, model) {
    requireAuth(event, response, speaker.get("LinkAccount"), function() {
        const activeQuestion = constants.questions.ExclusiveNumber;
        model.enterQuestionMode(activeQuestion);

        const excList = speaker.get("ExclusivePreamble") + 
                        speaker.get("ExclusiveList");
        const prompt = speaker.getQuestionSpeech(activeQuestion, "original")

        response.speak(excList + prompt)
                .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
                .send();
    });
}

function playFavorite(event, response, model) {
    requireAuth(event, response, speaker.get("LinkAccount"), function() {

        const show = getShowFromSlotValue(event.request);    
        if (show) {
            model.exitQuestionMode();
            startPlayingFavorite(show, response, model);
        }
        else {
            let activeQuestion = constants.questions.FavoriteShowTitle;
            model.enterQuestionMode(activeQuestion);

            response.speak(speaker.getQuestionSpeech(activeQuestion, "original"))
                    .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
                    .send();
        }
    });
}

function listShows(event, response, model) {
    let speech = speaker.get("ShowList");

    const activeQuestion = model.getActiveQuestion();
    
    if (isQuestionAskingForShowTitle(activeQuestion)) {
        speech += " " + speaker.getQuestionSpeech(activeQuestion, 'reprompt');
        response.speak(speech)
                .listen(speaker.getQuestionSpeech(activeQuestion, 'reprompt'));
    }
    else {
        response.speak(speech);
    }

    response.send();
}

function whoIsMatt(event, response, model) {
    model.exitQuestionMode();

    gimlet.getMLIs(function(urls, err) {
        if (err || urls.length == 0) {
            // TODO
            response.speak("Sorry, there was a problem.").send();
            return;
        }

        // pick random urls
        let mattLieberIndex = Math.floor(Math.random() * urls.length);
        const url = urls[mattLieberIndex];

        const content = `<audio src="${url}" />`;
        response.speak(content).send();
    });
}

function cancel(event, response, model) {
    // if we're not actively asking the user a question, and playback isn't idle, then
    //  the audio player might be running. In that case, we need to silently stop it.
    const audioPlayerMayHaveFocus = !model.getActiveQuestion() && !model.isPlaybackIdle()

    // cut off any lingering question session
    model.exitQuestionMode();

    if (audioPlayerMayHaveFocus) {
        response.audioPlayerStop();
    }
    else {
        response.speak(speaker.get("Goodbye"));
    }
    response.send();
}

function showTitleNamed(event, response, model) {
    const activeQuestion = model.getActiveQuestion();
    if (isQuestionAskingForShowTitle(activeQuestion)) {
        if(!getShowFromSlotValue(event.request)) {
            // delegate to unhandled input handler for this state
            unhandledAction.apply(this, arguments);
        }
        else {
            model.exitQuestionMode();

            if (activeQuestion === constants.questions.FavoriteShowTitle) {
                playFavorite.apply(this, arguments);
            }
            else { // should be MostRecentShowTitle question
                playLatest.apply(this, arguments);
            }
        }
    }
    else {
        // if the user just names a show on its own, take it to mean "play the latest ..."
        model.exitQuestionMode();
        playLatest.apply(this, arguments);
    }

    // TODO: refactor to end request here, way too easy to miss sending for a new branch
    // note: all branches above send response
}

function exclusiveChosen(event, response, model) {
    const number = getNumberFromSlotValue(event.request);

    gimlet.getExclusives(function(exclusives, err) {
        if (err || !exclusives) {
            // TODO
            response.speak("Sorry, there was a problem.").send();
            return;
        }

        const exclusive = exclusives[number-1];
        if (exclusive) {
            model.exitQuestionMode();

            const title = exclusive.title || `Exclusive #${number}`;
            const track = new Track(exclusive.content, title);
            startPlayback(response, model, track, 0, exclusive.intro);
            response.send();
        }
        else {
            // defer index out of range to unhandled
            unhandledAction.apply(this, arguments);
        }
    });
}

function pause(event, response, model) {
    model.exitQuestionMode();
    response.audioPlayerStop().send();
}

function stop(event, response, model) {
    model.exitQuestionMode();
    response.audioPlayerStop().send();
}

function resume(event, response, model) {
    model.exitQuestionMode();

    if (!model.isPlaybackIdle()) {
        const pbState = model.getPlaybackState();
        startPlayback(response, model, pbState.track, pbState.offset);
    }
    response.send();
}

function startOver(event, response, model) {
    model.exitQuestionMode();

    const pbState = model.getPlaybackState();
    if (pbState.track) {
        // if our player has a track (even if it's idle, after having finished the track), we'll restart it
        startPlayback(response, model, pbState.track);
    }
    else {
        response.speak(speaker.get("EmptyQueueMessage"));
    }
    response.send();
}

function resumeConfirmationYes(event, response, model) {
    model.exitQuestionMode();
    resume.apply(this, arguments);
}

function resumeConfirmationNo(event, response, model) {
    model.exitQuestionMode();
    model.clearPlaybackState();

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

/**
 * Lifecycle events
 */

function sessionEnded(event, response, model) {
    model.exitQuestionMode();
    response.exit(true);
}

function playbackStarted(event, response) {
    response.exit(false);
}

function playbackStopped(event, response, model) {
    const offset = event.request.offsetInMilliseconds;
    
    if (offset !== undefined) {
        model.updateOffset(offset);
    }
    response.exit(true);
}

function playbackNearlyFinished(event, response) {
    response.exit(false);
}

function playbackFinished(event, response, model) {
    model.markTrackFinished();
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

function unhandledAction(event, response, model) {
    /* This function is triggered whenever an intent is understood by Alexa, 
        but we define no handler for it in the current application state.
    */
    const activeQuestion = model.getActiveQuestion();
    if (activeQuestion) {
        const speech = speaker.getQuestionSpeech(activeQuestion, 'unhandled');
        const reprompt = speaker.getQuestionSpeech(activeQuestion, 'reprompt');

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

function startPlayingMostRecent(show, response, model) {
    gimlet.getFeedMap(function(feedMap, err) {
        if (err) {
            // TODO
            response.speak("Sorry, there was a problem.").send();
            return;
        }

        const url = feedMap[show.id];
        if (!url) {
            // TODO
            response.speak("Sorry, there was a problem.").send();
            return;
        }

        rss.parseURL(url, function(err, parsed) {
            if (err) {
                // TODO
                response.speak("Sorry, there was a problem.").send();
                return;
            }

            const entry = parsed.feed.entries[0];
            if (!entry) {
                // TODO
                response.speak("Sorry, there was a problem.").send();
                return;
            }

            // Alexa only plays HTTPS urls, feeds give us HTTP ones
            const url = entry.enclosure.url.replace('http://', 'https://');
            const intro = speaker.introduceMostRecent(show);
            const track = new Track(url, entry.title, show);

            startPlayback(response, model, track, 0, intro);

            response.send();
        });
    });
}

function startPlayingFavorite(show, response, model) {
    gimlet.getFavoritesMap(function(favoritesMap, err) {
        if (err || !favoritesMap) {
            // TODO
            response.speak("Sorry, there was a problem.").send();
            return;
        }

        const favs = favoritesMap[show.id];
        if (!favs) {
            // TODO
            response.speak("Sorry, there was a problem.").send();
            return;
        }

        // ensure attribute exists
        if (!model.getAttr('playbackHistory')) {
            model.setAttr('playbackHistory', { 
                lastFavoriteIndex: {}   // map of show id: last played index
            });
        }

        // get the favorite index that was last played (default to infinity)
        const history = model.getAttr('playbackHistory');
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

        const intro = speaker.introduceFavorite(show);
        const title = fav.title || "";
        const track = new Track(fav.content, title, show);
        
        startPlayback(response, model, track, 0, intro);
        response.send();
    });
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

function isQuestionAskingForShowTitle(question) {
    return question === constants.questions.FavoriteShowTitle ||
           question === constants.questions.MostRecentShowTitle;
}

function getNumberFromSlotValue(request) {
    const slot = request.intent.slots["Number"];
    if (slot && slot.value !== undefined) {
        return Number(slot.value);
    }
}

function startPlayback(response, model, track, offset, intro) {
    if (intro) {
        response.speak(intro);
    }

    offset = offset || 0;
    model.setPlaybackState(track, offset);
    response.audioPlayerPlay("REPLACE_ALL", 
        track.url, 
        track.url,
        null, 
        offset);
}

function urlToSSML(url) {
    return `<audio src="${url}" />`;
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
