/**
 * dialogueActions.js
 * Author: Greg Nicholas
 * 
 * Actions performed in response to user intents while in midst of a
 * dialogue with Alexa. Currently, this "dialogue" consists of a simple
 * direct question.
 */

"use strict";

const utils = require('./utils');
const speaker = require('./speaker');
const defaultStateActions = require('./mainActions');
const gimlet = require("./gimlet");
const contentToken = require("./contentToken");
const constants = require("./constants");

const actions = {
    launchRequest: launchRequest,
    help: help,
    cancel: cancel,

    listShows: listShows,
    showTitleNamed: showTitleNamed,
    
    exclusiveChosen: exclusiveChosen,

    resumeConfirmationYes: resumeConfirmationYes,
    resumeConfirmationNo: resumeConfirmationNo,

    sessionEnded: sessionEnded,
    unhandledAction: unhandledAction
};

module.exports = actions;

/**
 * Called when app is launched with active question in play.
 * 
 * We should be cleaning up after ourselves so this never happens,
 * but just in case we implement this to break us out of an 
 * unintented question loop.
 */
function launchRequest(event, response, model) {
    model.exitQuestionMode();
    defaultStateActions.launchRequest.apply(this, arguments);
}

/**
 * Speak a question-specific help response, then listen for
 * a response with a question-specific reprompt.
 */
function help(event, response, model) {
    let speech;
    let reprompt;

    let activeQuestion = model.getActiveQuestion();
    if (activeQuestion) {
        speech = speaker.getQuestionSpeech(activeQuestion, 'help');
        reprompt = speaker.getQuestionSpeech(activeQuestion, 'reprompt');
        
        // ensure the help counter is reset -- it's n/a for question help 
        // messages (see defaultActions's help action for details)
        model.clearAttr("helpCtr");
    }
    else {
        // shouldn't reach this point
        speech = speaker.get("Help");
    }

    response.speak(speech);
    if (reprompt) {
        response.listen(reprompt);
    }
    response.send();
}

/**
 * Give up on the current question and ask the user a general "what next" question.
 */
function cancel(event, response, model) {
    model.exitQuestionMode();
    const speech = speaker.get("WhatToDo");
    response.speak(speech)
            .listen(speech)
            .send();
}


/**
 * List all of Gimlet's shows, then repeat the current question. 
 */
function listShows(event, response, model) {
    let speech = speaker.get("ShowList");

    const activeQuestion = model.getActiveQuestion();
    
    speech += " " + speaker.getQuestionSpeech(activeQuestion, 'reprompt');
    response.speak(speech)
            .listen(speaker.getQuestionSpeech(activeQuestion, 'reprompt'));

    response.send();
}

/**
 * Called when the user named a particular show. Presumably in response to a quesiton
 * asking for a show name.
 */
function showTitleNamed(event, response, model) {
    const activeQuestion = model.getActiveQuestion();
    
    // all branches of logic lead to calling another action function
    let actionToTake;
    
    if(!utils.getShowFromSlotValue(event.request)) {
        // delegate to unhandled input handler for this state
        actionToTake = unhandledAction;
    }
    else {
        model.exitQuestionMode();
        if (activeQuestion === constants.questions.FavoriteShowTitle) {
            actionToTake = defaultStateActions.playFavorite;
        }
        else { // should be MostRecentShowTitle question
            actionToTake = defaultStateActions.playLatest;
        }
    }
    actionToTake.apply(this, arguments);
}

/**
 * Called when the user selected a numbered exclusive. Plays the exclusive for 
 * them, assuming the number makes sense. If it doesn't defer to "unhandled"
 * to repeat the question.
 */
function exclusiveChosen(event, response, model) {
    const origArgs = arguments;
    const number = utils.getNumberFromSlotValue(event.request);

    // we might need to defer to the unhandledAction function below -- bind
    // the context and arguments to it now
    const deferToUnhandled = Function.apply.bind(unhandledAction, this, arguments);

    gimlet.getExclusives().then(exclusives => {
        if (!exclusives) {
            throw new Error("No exclusive content found");
        }

        const exclusive = exclusives[number-1];
        if (exclusive) {
            model.exitQuestionMode();

            const title = exclusive.title || `Exclusive #${number}`
            const cardTitle = "Playing Members-Only Exclusive";
            const cardContent = `Now playing ${title}.`;

            const token = contentToken.create(
                contentToken.TYPES.EXCLUSIVE,
                exclusive.content,
                {index: number-1}
            );
            
            if (exclusive.intro) {
                response.speak(exclusive.intro);
            }

            response.cardRenderer(cardTitle, cardContent)
                    .audioPlayerPlay('REPLACE_ALL', exclusive.content, contentToken.serialize(token), null, 0)
                    .send();
        }
        else {
            deferToUnhandled();
        }
    }).catch(utils.speakAndSendError(response));
}

/**
 * Resume the currently paused audio track.
 */
function resumeConfirmationYes(event, response, model) {
    model.exitQuestionMode();
    defaultStateActions.resume.apply(this, arguments);
}

/**
 * Forget about the currently paused audio track and ask the user what's next.
 */
function resumeConfirmationNo(event, response, model) {
    model.exitQuestionMode();
    model.clearPlaybackState();

    const message = speaker.get("WhatToDo");
    response.speak(message)
            .listen(message)
            .send();
}

/**
 * Triggered when an intent is understood, but we don't have a handler defined
 * for it in the current state. We'll respond with a query specific to the 
 * question currently being asked.
 */
function unhandledAction(event, response, model) {  
    const activeQuestion = model.getActiveQuestion();
    if (activeQuestion) {
        const speech = speaker.getQuestionSpeech(activeQuestion, 'unhandled');
        const reprompt = speaker.getQuestionSpeech(activeQuestion, 'reprompt');

        response.speak(speech)
                .listen(reprompt)
                .send();
    }
    else {
        // shouldn't happen, but clear out just in case
        model.exitQuestionMode();
        response.sendNil({saveState: true});
    }
}

/**
 * Clears the active question state in case he session ends for some 
 * unaccounted for reason.
 */
function sessionEnded(event, response, model) {
    model.exitQuestionMode();
    response.sendNil({saveState: true});
}
