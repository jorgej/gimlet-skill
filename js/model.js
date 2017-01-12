const constants = require('./constants');

const questions = constants.questions;
const appStates = constants.states;

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
    this.getPlaybackState = function() {
        const pbDataStr = this.underlyingHandlerContext.attributes["pb"];
        if (pbDataStr) {
            let pbData = JSON.parse(pbDataStr);
            return pbData;
        }
        else {
            return {};
        }
    }

    this.isPlaybackIdle = function() {
        const pbDataStr = this.underlyingHandlerContext.attributes["pb"];
        if (pbDataStr) {
            let pbData = JSON.parse(pbDataStr);
            return pbData.offset === undefined || pbData.offset === Infinity;
        }
        return true;
    }

    this.setPlaybackState = function(track, offset=0) {
        // concat track and offset properties
        const pbData = {
            track: track,
            offset: offset
        };
        this.underlyingHandlerContext.attributes["pb"] = JSON.stringify(pbData);
    }
    this.updateOffset = function(offset) {
        const pbDataStr = this.underlyingHandlerContext.attributes["pb"];
        if (pbDataStr) {
            let pbData = JSON.parse(pbDataStr);
            this.setPlaybackState(pbData.track, offset);
        }
    }

    this.markTrackFinished = function() {
        this.updateOffset(Infinity);
    } 

    this.clearPlaybackState = function() {
        delete this.underlyingHandlerContext.attributes["pb"];
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

module.exports = RequestModel;
