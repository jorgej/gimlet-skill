'use strict';

const speaker = require("./speaker");
const constants = require("./constants");
const gimlet = require("./gimlet");
const contentHelper = require("./contentHelper");
const ContentToken = require("./token");
const utils = require('./utils');
const _ = require('lodash');
const playbackState = require("./playbackState");

const appStates = constants.states;

const actions = {
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

// add help tracking "request middleware" to all actions
_.mapValues(actions, action => helpTrackingDecorator(action));

module.exports = actions;

/**
 * Actions
 */
function launchRequest(event, response, model) {
    // we can assume we're in DEFAULT state
    let speech, reprompt;

    const pb = model.getPlaybackState();
    if (playbackState.isValid(pb) && !playbackState.isFinished(pb)) {
        // if there's a track already enqueued, and it hasn't yet finished,
        //  we ask if the user want to continue playback
        model.enterQuestionMode(constants.questions.ConfirmResumePlayback);
        speech = speaker.askToResume(pb.token.showId);
    }
    else {
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

function playLatest(event, response, model) {
    const showId = utils.getShowFromSlotValue(event.request);
    if (showId) {
        if (gimlet.isSerialShow(showId)) {
            let lastPlayedIndex = model.getLatestSerialFinished(showId);
            if (lastPlayedIndex === undefined) {
                lastPlayedIndex = -1
            }

            // helper function takes it from here (including calling response.send())
            playSerialHelper(response, model, showId, lastPlayedIndex+1);
        }
        else {
            // helper function takes it from here (including calling response.send())
            playLatestHelper(response, model, showId);
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

function listShows(event, response, model) {
    response.speak(speaker.get("ShowList"))
            .send();
}

function showTitleNamed(event, response, model) {
    // if the user just names a show on its own, take it to mean "play the latest ..."
    playLatest.apply(this, arguments);
}

function pause(event, response, model) {
    response.audioPlayerStop().send();
}

function stop(event, response, model) {
    response.audioPlayerStop().send();
}

function resume(event, response, model) {
    const pb = model.getPlaybackState();
    if (playbackState.isValid(pb) && !playbackState.isFinished(pb)) {
        response.audioPlayerPlay('REPLACE_ALL', pb.token.url, pb.token.toString(), null, pb.offset);
    }
    response.send();
}

function startOver(event, response, model) {
    const pb = model.getPlaybackState();
    if (playbackState.isValid(pb)) {
        response.audioPlayerPlay('REPLACE_ALL', pb.token.url, pb.token.toString(), null, 0);
    }
    else {
        // otherwise, there was no audio there to restart
        response.speak(speaker.get("EmptyQueueMessage"))
                .listen(speaker.get("WhatToDo"));
    }
    response.send();
}

function playbackOperationUnsupported(event, response, model) {
    const speech = speaker.get("UnsupportedOperation");
    response.speak(speech)
            .send();
}

function sessionEnded(event, response, model) {
    model.exitQuestionMode();
    response.sendNil({saveState: true});
}

/**
 * Misc. handlers
 */

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

/**
 * Helpers
 */

function playLatestHelper(response, model, showId) {
    contentHelper.fetchLatestEpisode(response, showId)
    .then(episode => {
        const intro = speaker.introduceMostRecent(showId);

        const showTitle = gimlet.titleForShow(showId);
        const cardTitle = `Playing ${showTitle}`;
        const cardContent = `Now playing the most recent episode of ${showTitle}, "${episode.title}".`

        const token = ContentToken.createToken(
            ContentToken.TYPES.LATEST,
            episode.url,
            {showId: showId}
        );

        if (intro) {
            response.speak(intro);
        }

        response.cardRenderer(cardTitle, cardContent)
                .audioPlayerPlay('REPLACE_ALL', episode.url, token.toString(), null, 0)
                .send();
    })
    .catch(utils.speakAndSendError(response));
}

function playSerialHelper(response, model, showId, epIndex) {
    contentHelper.fetchSerialEpisode(response, showId, epIndex)
        .then(episode => {
            const intro = speaker.introduceSerial(showId);

            const showTitle = gimlet.titleForShow(showId);
            const cardTitle = `Playing ${showTitle}`;
            const cardContent = `Now playing the next episode of ${showTitle}, "${episode.title}".`

            const token = ContentToken.createToken(
                ContentToken.TYPES.SERIAL,
                episode.url, 
                {showId: showId, index: episode.index}
            );

            if (intro) {
                response.speak(intro);
            }

            response.cardRenderer(cardTitle, cardContent)
                    .audioPlayerPlay('REPLACE_ALL', episode.url, token.toString(), null, 0)
                    .send();
        })
        .catch(utils.speakAndSendError(response));
}

function playFavoriteHelper(response, model, showId, favIndex) {
    contentHelper.fetchFavoriteEpisode(response, showId, favIndex)
        .then(episode => {
            const token = ContentToken.createToken(
                ContentToken.TYPES.FAVORITE,
                episode.url,
                {showId: showId, index: episode.index}
            );

            const intro = speaker.introduceFavorite(showId);
            const showTitle = gimlet.titleForShow(showId);

            const cardTitle = `Playing ${showTitle}`
            const cardContent = (episode.title) ? 
                `Now playing a staff-favorite episode of ${showTitle}, "${episode.title}".` :
                `Now playing a staff-favorite episode of ${showTitle}.`

            response.speak(intro)
                    .cardRenderer(cardTitle, cardContent)
                    .audioPlayerPlay('REPLACE_ALL', episode.url, token.toString(), null, 0)
                    .send();
        })
        .catch(utils.speakAndSendError(response));
}

function helpTrackingDecorator(innerFn) {
    return function(event, response, model) {
        const resumeAction = innerFn.bind(this, ...arguments);
        if (event.request.type === "IntentRequest") {
            // only mess with the help counter if it's an intent request
            let helpCount = model.getAttr("helpCtr") || 0;
            const intentName = event.request.intent && event.request.intent.name;
            if (intentName === "AMAZON.HelpIntent") {
                helpCount++;
            }
            else {
                helpCount = 0;
            }
            model.setAttr("helpCtr", helpCount);
        }
        return resumeAction();
    };
}
