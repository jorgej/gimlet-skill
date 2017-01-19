'use strict';

const speaker = require("./speaker");
const constants = require("./constants");
const gimlet = require("./gimlet");
const authHelper = require("./authHelper");
const playbackHelpers = require("./playbackHelpers");

const ContentToken = require("./token");

const appStates = constants.states;

const actions = {
    launchRequest: authDecorator(launchRequest),

    playLatest: authDecorator(playLatest),
    playExclusive: authDecorator(playExclusive),
    playFavorite: authDecorator(playFavorite),

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

// add help tracking "middleware" to all actions
for(let key in actions) {
    actions[key] = helpTrackingDecorator(actions[key]);
}

module.exports = actions;


/**
 * Actions
 */
function launchRequest(event, response, model) {
    // we can assume we're in DEFAULT state
    let speech, reprompt;

    const pbState = model.getPlaybackState();
    if (pbState.isValid() && !pbState.isFinished()) {
        // if there's a track already enqueued, and it hasn't yet finished,
        //  we ask if the user want to continue playback
        model.enterQuestionMode(constants.questions.ConfirmResumePlayback);
        const contentToken = ContentToken.fromString(pbState.token);
        speech = speaker.askToResume(contentToken.showId);
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
    const showId = getShowFromSlotValue(event.request);
    if (showId) {
        model.exitQuestionMode();
        
        const savePlaybackStateAndRespond = function(pbState) {
            // if promise used below succeeds, persist the new playback state
            model.setPlaybackState(pbState);
            response.send();
        };

        if (gimlet.isSerialShow(showId)) {
            const lastPlayedIndex = model.getLatestSerialFinished(showId);
            playbackHelpers.startPlayingSerial(response, showId, lastPlayedIndex)
                .then(savePlaybackStateAndRespond)
                .catch(speakAndSendError(response));
        }
        else {
            playbackHelpers.startPlayingMostRecent(response, showId)
                .then(savePlaybackStateAndRespond)
                .catch(speakAndSendError(response));
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
    const showId = getShowFromSlotValue(event.request);    
    if (!showId) {
        let activeQuestion = constants.questions.FavoriteShowTitle;
        model.enterQuestionMode(activeQuestion);

        response.speak(speaker.getQuestionSpeech(activeQuestion, "original"))
                .listen(speaker.getQuestionSpeech(activeQuestion, "reprompt"))
                .send();
        return;
    }

    model.exitQuestionMode();
    const lastPlayedIndex = model.getLatestFavoriteStart(showId) || 0;
    
    playbackHelpers.startPlayingFavorite(response, showId, lastPlayedIndex+1)
        .then(pbState => {
            // if the call succeeded, persist the new playback state
            model.setPlaybackState(pbState);
            response.send();
        })
        .catch(speakAndSendError(response));
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

    gimlet.getMLIs().then(urls => {
        if (!urls.length) {
            throw new Error("No content URLs were found");
        }

        // pick random urls
        let mattLieberIndex = Math.floor(Math.random() * urls.length);
        const url = urls[mattLieberIndex];

        const content = urlToSSML(url);
        response.speak(content).send();
    })
    .catch(speakAndSendError(response));
}

function cancel(event, response, model) {
    model.exitQuestionMode();   // ensure we kill any active questioning
    const pbState = model.getPlaybackState();
    if (pbState.isValid() && !pbState.isFinished()) {
        response.audioPlayerStop();
    }
    else {
        response.speak(speaker.get("Goodbye"));
    }

    response.send();
}

function showTitleNamed(event, response, model) {
    const activeQuestion = model.getActiveQuestion();
    // all branches of logic lead to calling another action function
    let actionToTake;
    if (isQuestionAskingForShowTitle(activeQuestion)) {
        if(!getShowFromSlotValue(event.request)) {
            // delegate to unhandled input handler for this state
            actionToTake = actions.unhandledAction;
        }
        else {
            model.exitQuestionMode();

            if (activeQuestion === constants.questions.FavoriteShowTitle) {
                actionToTake = actions.playFavorite;
            }
            else { // should be MostRecentShowTitle question
                actionToTake = actions.playLatest;
            }
        }
    }
    else {
        // if the user just names a show on its own, take it to mean "play the latest ..."
        model.exitQuestionMode();
        actionToTake = actions.playLatest;
    }

    actionToTake.apply(this, arguments);
}

function exclusiveChosen(event, response, model) {
    const origArgs = arguments;
    const number = getNumberFromSlotValue(event.request);

    // while in original execution context, create a function we might use below
    const deferToUnhandled = unhandledAction.bind(this, ...arguments);

    gimlet.getExclusives().then(exclusives => {
        if (!exclusives) {
            throw new Error("No exclusive content found");
        }

        const exclusive = exclusives[number-1];
        if (exclusive) {
            model.exitQuestionMode();

            const contentUrl = exclusive.content;
            const token = ContentToken.createExclusive();
            
            const pbState = playbackHelpers.beginPlayback(response, contentUrl, token);
            model.setPlaybackState(pbState);

            const title = exclusive.title || `Exclusive #${number}`;

            response.cardRenderer("Playing Members-Only Exclusive", 
                        `Now playing ${title}.`)
                    .send();
        }
        else {
            deferToUnhandled();
        }
    }).catch(speakAndSendError(response));
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
    playbackHelpers.resumePlayback(response, model.getPlaybackState());
    response.send();
}

function startOver(event, response, model) {
    model.exitQuestionMode();

    const newPbState = playbackHelpers.restartPlayback(response, model.getPlaybackState());
    if (newPbState) {
        // if we successfully set a new playback state, persist it
        model.setPlaybackState(newPbState);
    }
    else {
        // otherwise, there was no audio there to restart
        response.speak(speaker.get("EmptyQueueMessage"))
                .listen(speaker.get("WhatToDo"));
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


/***
 * Decorators 
 */

function helpTrackingDecorator(innerFn) {
    return function(event, response, model) {
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
        return innerFn.apply(this, arguments);
    };
}

function authDecorator(innerFn) {
    return function(event, response, model) {
        const origArgs = arguments;
        authHelper.isSessionAuthenticated(event.session, function(auth) {
            if (auth) {
                innerFn.apply(this, origArgs);
            }
            else {
                response.speak(prompt)
                        .linkAccountCard()
                        .send();
            }
        });
    };
}

/**
 * Helpers
 */

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

function speakAndSendError(response) {
    return function(err) {
        response.speak(speaker.get("Error")).send();
    };
}
