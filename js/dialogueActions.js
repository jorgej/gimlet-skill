const utils = require('./utils');
const speaker = require('./speaker');
const defaultStateActions = require('./defaultActions');
const gimlet = require("./gimlet");

const ContentToken = require("./token");

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
}

module.exports = actions;

function launchRequest(event, response, model) {
    // shouldn't ever launch in questioin state. If we do, just clear the state so the next interaction
    model.exitQuestionMode();
    defaultStateActions.launchRequest.apply(this, arguments);
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
        // TODO
    }

    response.speak(speech);
    if (reprompt) {
        response.listen(reprompt);
    }
    response.send();
}

function cancel(event, response, model) {
    response.speak(speaker.get("Goodbye"))
            .send();
}

function listShows(event, response, model) {
    let speech = speaker.get("ShowList");

    const activeQuestion = model.getActiveQuestion();
    
    speech += " " + speaker.getQuestionSpeech(activeQuestion, 'reprompt');
    response.speak(speech)
            .listen(speaker.getQuestionSpeech(activeQuestion, 'reprompt'));

    response.send();
}

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

function exclusiveChosen(event, response, model) {
    const origArgs = arguments;
    const number = utils.getNumberFromSlotValue(event.request);

    // while in original execution context, create a function we might use below
    const deferToUnhandled = unhandledAction.bind(this, ...arguments);

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

            const contentUrl = exclusive.content;
            const token = ContentToken.createExclusive(contentUrl, number-1);
            
            response.cardRenderer(cardTitle, cardContent)
                    .audioPlayerPlay('REPLACE_ALL', contentUrl, token.toString(), null, 0)
                    .send();
        }
        else {
            deferToUnhandled();
        }
    }).catch(utils.speakAndSendError(response));
}

function resumeConfirmationYes(event, response, model) {
    model.exitQuestionMode();
    defaultStateActions.resume.apply(this, arguments);
}

function resumeConfirmationNo(event, response, model) {
    model.exitQuestionMode();
    model.clearPlaybackState();

    const message = speaker.get("WhatToDo");
    response.speak(message)
            .listen(message)
            .send();
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
}

function sessionEnded(event, response, model) {
    model.exitQuestionMode();
    response.exit(true);
}
