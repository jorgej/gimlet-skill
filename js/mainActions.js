/**
 * mainActions.js
 * Author: Greg Nicholas
 * 
 * Main actions performed by skill -- these handle the major intents
 * spoken by the user when not responding to a specific question.
 */

"use strict";

const speaker = require("./speaker");
const constants = require("./constants");
const gimlet = require("./gimlet");
const contentHelper = require("./contentHelper");
const contentToken = require("./contentToken");
const utils = require('./utils');
const _ = require('lodash');
const playbackState = require("./playbackState");

const appStates = constants.states;

// list of all actions that'll be exported
let actions = {
    launchRequest: launchRequest,

    help: help,
    cancel: cancel,

    playLatest: playLatest,
    playExclusive: playExclusive,
    playFavorite: playFavorite,

    listShows: listShows,
    whoIsMatt: whoIsMatt,
    showTitleNamed: showTitleNamed,

    pause: pause,
    stop: stop,
    resume: resume,
    playbackOperationUnsupported: playbackOperationUnsupported,
    startOver: startOver,

    sessionEnded: sessionEnded,
    unhandledAction: unhandledAction
};

// add help tracking "request middleware" to all actions (see decorator for details)
actions = _.mapValues(actions, action => helpTrackingDecorator(action));

module.exports = actions;

/**
 * Actions
 */

/**
 * Called when user opens skill without explicit intent. If the user has an episode that
 * is currently paused, we'll ask them if they want to resume it. Otherwise, we greet 
 * them with a generic welcome message
 */
function launchRequest(event, response, model) {
    let speech, reprompt;

    const pb = model.getPlaybackState();
    if (playbackState.isValid(pb) && !playbackState.isFinished(pb)) {
        // if there's a track already enqueued, and it hasn't yet finished,
        //  we ask if the user want to continue playback
        model.enterQuestionMode(constants.questions.ConfirmResumePlayback);

        speech = speaker.askToResume(pb.token.info.showId);
    }
    else {
        // Otherwise, give them a welcome message. Verbosity depend on if they're a first-time user
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

/**
 * Give the user help for using the skill. There are multiple "escalation levels"
 * of help messaging, depending on how many times in a row they've asked
 * for help. We track this in middleware defined elsewhere in this file.
 */
function help(event, response, model) {
    let speech;
    let reprompt;

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

    response.speak(speech)
            .listen(speaker.get("WhatToDo"))
            .send();
}

/**
 * If the audio player is currently playing, we stop it. Otherwise, we say 
 * goodbye and close out.
 */
function cancel(event, response, model) {
    const pb = model.getPlaybackState();
    if (playbackState.isValid(pb) && !playbackState.isFinished(pb)) {
        response.audioPlayerStop();
    }
    else {
        response.speak(speaker.get("Goodbye"));
    }

    response.send();
}

/**
 * Play either the latest episode of a show (for non-serialized shows), or
 * the next unheard episode according to the user's history (for serailized 
 * shows). Also supports speaking an explicit episode number for serialized 
 * shows.
 * 
 * Slots:
 * - ShowTitle: name of a show user wants to hear. If omitted, we'll ask them for it.
 * - Number: episode number. Optional, and only relevant to serial shows.
 */
function playLatest(event, response, model) {
    const showId = utils.getShowFromSlotValue(event.request);
    const epNumber = utils.getNumberFromSlotValue(event.request);

    if (showId) {
        if (gimlet.isSerialShow(showId)) {
            if (_.isNumber(epNumber)) {
                playSerialHelper(response, model, showId, epNumber-1);
            }
            else {
                playSerialHelper(response, model, showId);
            }
        }
        else {
            playLatestHelper(response, model, showId);
        }

        // Note: helper functions take it from here (including calling response.send())
    }
    else {
        let activeQuestion = constants.questions.FavoriteShowTitle;
        model.enterQuestionMode(activeQuestion);

        response.speak(speaker.getQuestionSpeech(activeQuestion, "original"))
                .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
                .send();
    }
}

/**
 * Indicates the user wants to hear a subscriber-exclusive content. We'll follow-up
 * by listing the content avaailble and asking for a selection.
 */
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

/**
 * Play a staff-favorite episode of a show.
 * 
 * Slots:
 * - ShowTitle: name of a show user wants to hear. If omitted, we'll ask them for it.
 */
function playFavorite(event, response, model) {
    const showId = utils.getShowFromSlotValue(event.request);    
    if (!showId) {
        let activeQuestion = constants.questions.FavoriteShowTitle;
        model.enterQuestionMode(activeQuestion);

        response.speak(speaker.getQuestionSpeech(activeQuestion, "original"))
                .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
                .send();
        return;
    }

    let lastPlayedIndex = model.getLatestFavoriteStart(showId);
    if (lastPlayedIndex === undefined) {
        lastPlayedIndex = -1;
    }
    
    // helper function takes it from here (including calling response.send())
    playFavoriteHelper(response, model, showId, lastPlayedIndex+1);
}

/**
 * Plays a "Matt Liber Is..." clip
 */
function whoIsMatt(event, response, model) {
    gimlet.getMLIs().then(urls => {
        if (!urls.length) {
            throw new Error("No content URLs were found");
        }

        // pick random urls
        let mattLieberIndex = Math.floor(Math.random() * urls.length);
        const url = urls[mattLieberIndex];

        const content = utils.urlToSSML(url);
        response.speak(content).send();
    })
    .catch(utils.speakAndSendError(response));
}

/**
 * List all Gimlet shows and exit.
 */
function listShows(event, response, model) {
    response.speak(speaker.get("ShowList"))
            .send();
}

/**
 * If we're in DEFAULT state and the user just names a show on its own, 
 * take it to mean "play the latest ..."
 */
function showTitleNamed(event, response, model) {
    playLatest.apply(this, arguments);
}

/**
 * Pauses playback
 */
function pause(event, response, model) {
    response.audioPlayerStop().send();
}

/**
 * Stops (in effect, pauses) playback
 */
function stop(event, response, model) {
    response.audioPlayerStop().send();
}

/**
 * Resumes playback if soemthing unfinished is still queued up
 */
function resume(event, response, model) {
    const pb = model.getPlaybackState();
    if (playbackState.isValid(pb) && !playbackState.isFinished(pb)) {
        response.audioPlayerPlay('REPLACE_ALL', pb.token.url, contentToken.serialize(pb.token), null, pb.offset);
    }
    response.send();
}

/**
 * If an episode is still queued up, retarts playback from the beginning. If there's
 * nothing in the queue, tell the user that fact.
 */
function startOver(event, response, model) {
    const pb = model.getPlaybackState();
    if (playbackState.isValid(pb)) {
        response.audioPlayerPlay('REPLACE_ALL', pb.token.url, contentToken.serialize(pb.token), null, 0);
    }
    else {
        // otherwise, there was no audio there to restart
        response.speak(speaker.get("EmptyQueueMessage"))
                .listen(speaker.get("WhatToDo"));
    }
    response.send();
}

/**
 * We don't support a subset of standard Alexa playback operations (e.g. "next", 
 * "shuffle on", etc.)
 */
function playbackOperationUnsupported(event, response, model) {
    const speech = speaker.get("UnsupportedOperation");
    response.speak(speech)
            .send();
}

/**
 * Session ends outside of our control
 */
function sessionEnded(event, response, model) {
    // should be impossible to get here with an active question, 
    // but just in case let's wipe the slate clean
    model.exitQuestionMode();
    response.sendNil({saveState: true});
}

/**
 * Triggered when an intent is understood, but we don't have a handler defined
 * for it in the current state. We respond to this occasion by telling the
 * user we didn't understand, and asking for clarification. 
 */
function unhandledAction(event, response, model) {
    response.speak(speaker.get("_Unhandled"))
            .listen(speaker.get("WhatToDo"))
            .send();
}

/**
 * Helpers
 */

function playLatestHelper(response, model, showId) {
    contentHelper.fetchLatestEpisode(showId)
    .then(episode => {
        const intro = speaker.introduceMostRecent(showId);

        const showTitle = gimlet.titleForShow(showId);
        const cardTitle = `Playing ${showTitle}`;
        const cardContent = `Now playing the most recent episode of ${showTitle}, "${episode.title}".`

        const token = contentToken.create(
            contentToken.TYPES.LATEST,
            episode.url,
            {showId: showId}
        );

        if (intro) {
            response.speak(intro);
        }

        response.cardRenderer(cardTitle, cardContent)
                .audioPlayerPlay('REPLACE_ALL', episode.url, contentToken.serialize(token), null, 0)
                .send();
    })
    .catch(utils.speakAndSendError(response));
}

function playSerialHelper(response, model, showId, epIndex) {
    // default to next unplayed episode according to user data
    if (epIndex === undefined) {
        let lastPlayedIndex = model.getLatestSerialFinished(showId);
        epIndex = (lastPlayedIndex === undefined) ? 0 : lastPlayedIndex+1;
    }
    
    contentHelper.fetchSerialEpisode(showId, epIndex)
        .then(episode => {
            const intro = speaker.introduceSerial(showId);

            const showTitle = gimlet.titleForShow(showId);
            const cardTitle = `Playing ${showTitle}`;
            const cardContent = `Now playing the next episode of ${showTitle}, "${episode.title}".`

            const token = contentToken.create(
                contentToken.TYPES.SERIAL,
                episode.url, 
                {showId: showId, index: episode.index}
            );

            if (intro) {
                response.speak(intro);
            }

            response.cardRenderer(cardTitle, cardContent)
                    .audioPlayerPlay('REPLACE_ALL', episode.url, contentToken.serialize(token), null, 0)
                    .send();
        })
        .catch(err => {
            if (err.name === contentHelper.EpisodeRangeErrorName) {
                response.speak(speaker.say("EpisodeNotFound"))
                        .send();
            }
            else {
                utils.speakAndSendError(response);
            } 
        });
}

function playFavoriteHelper(response, model, showId, favIndex) {
    contentHelper.fetchFavoriteEpisode(showId, favIndex)
        .then(episode => {
            const token = contentToken.create(
                contentToken.TYPES.FAVORITE,
                episode.url,
                {showId: showId, index: episode.index}
            );

            const showTitle = gimlet.titleForShow(showId);

            const cardTitle = `Playing ${showTitle}`
            const cardContent = (episode.title) ? 
                `Now playing a staff-favorite episode of ${showTitle}, "${episode.title}".` :
                `Now playing a staff-favorite episode of ${showTitle}.`

            if (episode.intro) {
                response.speak(episode.intro)
            }
            
            response.cardRenderer(cardTitle, cardContent)
                    .audioPlayerPlay('REPLACE_ALL', episode.url, contentToken.serialize(token), null, 0)
                    .send();
        })
        .catch(utils.speakAndSendError(response));
}

function helpTrackingDecorator(innerFn) {
    return function(event, response, model) {
        if (event.request.type === "IntentRequest") {
            // only mess with the help counter if it's an intent request
            let helpCount = model.getAttr("helpCtr") || 0;
            const intentName = event.request.intent && event.request.intent.name;
            if (intentName === "AMAZON.HelpIntent" || intentName === "NeedAssistance") {
                helpCount++;
            }
            else {
                helpCount = 0;
            }
            model.setAttr("helpCtr", helpCount);
        }
        return innerFn.apply(this, arguments);
    };
}
