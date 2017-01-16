const constants = require('./constants');

const questions = constants.questions;
const appStates = constants.states;

const PlaybackState = require('./playbackState');

function RequestModel(handlerContext) {
    this.underlyingHandlerContext = handlerContext;

    // Question mode methods
    this.enterQuestionMode = function(questionId) {
        setActiveQuestion.call(this, questionId);
        if (questionId === questions.ConfirmResumePlayback) {
            this.underlyingHandlerContext.handler.state = appStates.QUESTION_CONFIRM;
        }
        else if (questionId === questions.ExclusiveNumber) {
            this.underlyingHandlerContext.handler.state = appStates.QUESTION_EXCLUSIVE_NUMBER;
        }
        else if (questionId === questions.FavoriteShowTitle || questionId === questions.MostRecentShowTitle) {
            this.underlyingHandlerContext.handler.state = appStates.ASK_FOR_SHOW;
        }
    }
    this.exitQuestionMode = function() {
        clearActiveQuestion.call(this);
        this.underlyingHandlerContext.handler.state = appStates.DEFAULT;
    }
    this.getActiveQuestion = function() {
        return this.underlyingHandlerContext.attributes["activeQ"];
    }

    // Playback operations
    this.setPlaybackState = function(pbState) {
        this.underlyingHandlerContext.attributes["pb"] = pbState.toString();
    }

    this.getPlaybackState = function() {
        return PlaybackState.fromString(this.underlyingHandlerContext.attributes["pb"]);
    }

    this.clearPlaybackState = function() {
        delete this.underlyingHandlerContext.attributes["pb"];
    }


    this.setLatestFavoriteStart = function(showId, indexPlayed) {
        getHistory.call(this).favs[showId] = indexPlayed;
    }
    this.getLatestFavoriteStart = function(showId) {
        return getHistory.call(this).favs[showId];
    }

    this.setLatestSerialFinished = function(showId, indexPlayed) {
        getHistory.call(this).serials[showId] = indexPlayed;
    }
    this.getLatestSerialFinished = function(showId) {
        return getHistory.call(this).serials[showId];
    }

    this.getAttr = function(key) {
        return this.underlyingHandlerContext.attributes[key];
    }

    this.setAttr = function(key, val) {
        this.underlyingHandlerContext.attributes[key] = val;
    }
 
    this.clearAttr = function(key) {
        delete this.underlyingHandlerContext.attributes[key];
    }
}

// "Private" methods, intended to be called with RequestModel instance as "this"

function setActiveQuestion(questionId) {
    this.underlyingHandlerContext.attributes["activeQ"] = questionId;
}

function clearActiveQuestion() {
    delete this.underlyingHandlerContext.attributes["activeQ"];
}

function getHistory() {
    if (!this.underlyingHandlerContext.attributes["history"]) {
        this.underlyingHandlerContext.attributes["history"] = {
            "favs": {},
            "serials": {}
        }
    }
    return this.underlyingHandlerContext.attributes["history"];
}

module.exports = RequestModel;
