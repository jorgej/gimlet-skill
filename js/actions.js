'use strict';

const speaker = require("./speaker");
const constants = require("./constants");
const gimlet = require("./gimlet");
const authHelper = require("./authHelper");

const PlaybackState = require("./playbackState");
const ContentToken = require("./token");

const rss = require("rss-parser");

const appStates = constants.states;

function launchRequest(event, response, model) {
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
}

function help(event, response, model) {
    let speech;
    let reprompt;

    let activeQuestion = model.getActiveQuestion();
    if (activeQuestion) {
        speech = speaker.getQuestionSpeech(activeQuestion, 'help');
        reprompt = speaker.getQuestionSpeech(activeQuestion, 'reprompt');
        // ensure the help counter is reset -- it's n/a for question help messages
        model.clearAttr("helpCtr");
    }
    else {
        const helpCount = model.getAttr("helpCtr");
        if (helpCount > 2) {
            speech = speaker.get("Help3");
        }
        else if (helpCount === 2) {
            speech = speaker.get("Help2");
        }
        else {
            speech = speaker.get("Help");
        }

        reprompt = speaker.get("WhatToDo");
    }

    response.speak(speech);
    if (reprompt) {
        response.listen(reprompt);
    }
    response.send();
}

function playLatest(event, response, model) {
    const show = getShowFromSlotValue(event.request);
    if (show) {
        model.exitQuestionMode();
        if (isSerial(show)) {
            startPlayingSerial(show, response, model);
        }
        else {
            startPlayingMostRecent(show, response, model);
        }
    }
    else {
        let activeQuestion = constants.questions.FavoriteShowTitle;
        model.enterQuestionMode(activeQuestion);

        response.speak(speaker.getQuestionSpeech(activeQuestion, "original"))
                .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
                .send();
    }
}

function playExclusive(event, response, model) {
    const activeQuestion = constants.questions.ExclusiveNumber;
    model.enterQuestionMode(activeQuestion);

    const excList = speaker.get("ExclusivePreamble") + 
                    speaker.get("ExclusiveList");
    const prompt = speaker.getQuestionSpeech(activeQuestion, "original")

    response.speak(excList + prompt)
            .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
            .send();
}

function playFavorite(event, response, model) {
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
            response.speak(speaker.get("Error")).send();
            return;
        }

        // pick random urls
        let mattLieberIndex = Math.floor(Math.random() * urls.length);
        const url = urls[mattLieberIndex];

        const content = urlToSSML(url);
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
            response.speak(speaker.get("Error")).send();
            return;
        }

        const exclusive = exclusives[number-1];
        if (exclusive) {
            model.exitQuestionMode();

            const contentUrl = exclusive.content;

            beginPlayback(response, 
                model, 
                contentUrl,
                ContentToken.createExclusive().toString()
            );

            const title = exclusive.title || `Exclusive #${number}`;

            response.cardRenderer("Playing Members-Only Exclusive", 
                        `Now playing ${exclusive.title}`);


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
    resumePlayback(response, model);
    response.send();
}

function startOver(event, response, model) {
    model.exitQuestionMode();

    const didRestart = restartPlayback(response, model);
    if (!didRestart) {
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

function playbackStarted(event, response, model) {
    // if this track is a favorite, we want to note it in the user's history
    const token = ContentToken.fromString(event.request.token);
    if (token.isValidFavoriteToken()) {
        model.setLatestFavoriteStart(token.showId, token.index);
        response.exit(true);
    }
    response.exit(false);
}

function playbackStopped(event, response, model) {
    const offset = event.request.offsetInMilliseconds;
    const pbState = model.getPlaybackState();
    if (pbState.isValid() && offset !== undefined) {
        pbState.offset = offset;
        model.setPlaybackState(pbState);
    }
    response.exit(true);
}

function playbackNearlyFinished(event, response, model) {
    // nothing to do here -- we don't support queuing in this version
    response.exit(false);
}

function playbackFinished(event, response, model) {
    // mark playback as finished for the current track, but don't clear it in case 
    //  the user wants to issue a restart/previous/next command
    const pbState = model.getPlaybackState();
    if (pbState.isValid()) {
        pbState.markFinished();
        model.setPlaybackState(pbState);
    }

    // if this track is from a serial episode, we want to note it in the user's history
    const token = ContentToken.fromString(event.request.token);
    if (token.isValidSerialToken()) {
        model.setLatestSerialFinished(token.showId, token.index);
        response.exit(true);
    }
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

const actions = {
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

// TODO: cleanup

function wrapWithHelpTracker(innerFn) {
    return function(event, response, model) {
        if (event.request.type === "IntentRequest") {
            // only mess with the help counter if it's an intent request
            const helpCount = model.getAttr("helpCtr") || 0;
            const intentName = event.request.intent && event.request.intent.name;
            if (intentName === "AMAZON.HelpIntent") {
                helpCount++;
            }
            model.setAttr("helpCtr") = helpCount;
        }
        return innerFn.apply(this, arguments);
    };
}

function wrapWithAuth(innerFn) {
    return function(event, response, model) {
        authHelper.isSessionAuthenticated(event.session, function(auth) {
            if (auth) {
                innerFn.apply(this, arguments);
            }
            else {
                response.speak(prompt)
                        .linkAccountCard()
                        .send();
            }
        });
    };
}

for(let key in actions) {
    actions[key] = wrapWithHelpTracker(actions[key]);
}

for(let key in ['launchRequest', 'playLatest', 'playExclusive', 'playFavorite']) {
    actions[key] = wrapWithAuth(actions[key]);
}

module.exports = actions;

/**
 * Helpers
 */

function startPlayingMostRecent(show, response, model) {
    getFeedEntries(show.id, function(entries, err) {
        if (err) {
            response.speak(speaker.get("Error")).send();
            return;
        }

        const entry = entries[entries.length-1];
        if (!entry) {
            response.speak(speaker.get("Error")).send();
            return;
        }

        // Alexa only plays HTTPS urls, feeds give us HTTP ones
        const contentUrl = entry.enclosure.url.replace('http://', 'https://');
        
        beginPlayback(response,
            model,
            contentUrl,
            ContentToken.createLatest(show.id).toString()
        );

        const intro = speaker.introduceMostRecent(show);
        response.speak(intro)
                .cardRenderer(`Playing ${show.title}`, 
                              `Now playing the most recent episode of ${show.title}, "${entry.title}"`);

        response.send();
    });
}

function startPlayingSerial(show, response, model) {
    getFeedEntries(show.id, isFullLengthEpisode, function(entries, err) {
        if (err) {
            response.speak(speaker.get("Error")).send();
            return;
        }
        else if (!entries.length) {
            response.speak(speaker.get("Error")).send();
            return;
        }

        const lastFinishedIndex = model.getLatestSerialFinished(show.id);
        if (lastFinishedIndex === undefined) {
            lastFinishedIndex = -1;
        }

        // add one to the last index, cycling back to 0 at the end of the feed
        const nextIndex = (lastFinishedIndex + 1) % entries.length;
        const entry = entries[nextIndex];

        const intro = speaker.introduceSerial(show);
        if (intro) {
            response.speak(intro);
        }

        // Alexa only plays HTTPS urls, feeds give us HTTP ones
        const contentUrl = entry.enclosure.url.replace('http://', 'https://');

        beginPlayback(response,
            model,
            contentUrl,
            ContentToken.createSerial(show.id, nextIndex).toString()
        );

        response.cardRenderer(`Playing ${show.title}`, 
                              `Now playing the next episode of ${show.title}, "${entry.title}"`);

        response.send();
    });
}

function startPlayingFavorite(show, response, model) {
    gimlet.getFavoritesMap(function(favoritesMap, err) {
        if (err || !favoritesMap) {
            response.speak(speaker.get("Error")).send();
            return;
        }

        const favs = favoritesMap[show.id];
        if (!favs) {
            response.speak(speaker.get("Error")).send();
            return;
        }

        // get the favorite index that was last played (default to -1)
        const lastPlayedIndex = model.getLatestFavoriteStart(show.id);
        if (lastPlayedIndex === undefined) {
            lastPlayedIndex = -1;
        }

        // next index is either 1 + last, or cycled back down to 0
        const nextIndex = (lastPlayedIndex + 1) % favs.length;

        let fav = favs[nextIndex];
        if (!fav) {
            response.speak(speaker.get("Error")).send();
            return;
        }
        const contentUrl = fav.content;
        
        beginPlayback(response, 
            model,
            contentUrl,
            ContentToken.createFavorite(show.id, nextIndex)
        );

        const intro = speaker.introduceFavorite(show);
        
        let cardContent = `Now playing a staff-favorite episode of ${show.title}`
        if (fav.title) {
            cardContent += `, "${fav.title}"`
        }

        response.speak(intro)
                .cardRenderer(`Playing ${show.title}`)
                .send();
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

function urlToSSML(url) {
    return `<audio src="${url}" />`;
}

function isSerial(show) {
    return show.id === 'homecoming' || show.id === 'crimetown';
}

// callback arguments: ([entry], err)
function getFeedEntries(showId, filterFn, callback) {
    gimlet.getFeedMap(function(feedMap, err) {
        if (err || !feedMap[showId]) {
            callback(entry, new Error("Problem getting feed URL"));
            return;
        }
        
        const url = feedMap[showId];

        rss.parseURL(url, function(err, parsed) {
            if (err) {
                callback(entry, new Error("Problem fetching RSS feed"));
                return;
            }

            if (!filterFn) {
                filterFn = function() { return true; }
            }
            
            let entries = parsed.feed.entries.reverse();
            entries.reverse();
            if (filterFn) {
                entries = entries.filter(filterFn);
            }
            callback(entries, undefined);
        });
    });
}

function beginPlayback(response, model, url, token) {
    model.setPlaybackState(new PlaybackState(url, token, 0));
    resumePlayback(response, model);
}

function restartPlayback(response, model) {
    const pbState = model.getPlaybackState();
    if (pbState.isValid()) {
        pbState.offset = 0;
        model.setPlaybackState(pbState);
        return resumePlayback(response, model);
    }
    return false;
}

function resumePlayback(response, model) {
    const pbState = model.getPlaybackState();
    if (pbState.isValid() && !pbState.isFinished()) {
        response.audioPlayerPlay('REPLACE_ALL', pbState.url, pbState.token, null, pbState.offset);
        return true;
    }
    return false;
}

function isFullLengthEpisode(rssEntry) {
    const durationInSec = rssEntry['itunes'] && rssEntry['itunes']['duration'];
    if (durationInSec == undefined) {
        return true;    // default to true if no duration can be found
    }
    else {
        return durationInSec > 240;
    }
}
