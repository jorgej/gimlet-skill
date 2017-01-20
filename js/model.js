/**
 * model.js
 * Author: Greg Nicholas
 * 
 * Describes a domain-specific data store responsible for managing attributes and
 * state that goven app logic.
 */

"use strict";

const constants = require('./constants');

const questions = constants.questions;
const appStates = constants.states;

/**
 * Constructor for an agent that will manage all persistent and session data used
 * in the skill. Manages active question state, listening history, current
 * audio player state, and other attributes.
 * 
 * The argument is the function context object ("this") for an 
 * alexa-sdk handler function (see discussion in betterAlexa.js).
 * 
 * The resulting object is passed into all of our action functions (the "model" 
 * argument).
 * .
 */
function RequestModel(handlerContext) {
    this.underlyingHandlerContext = handlerContext;

    /**************************
     * Question state handling
     ***************************/
    
    /** 
     * Put the skill into a "question" mode, where Alexa will be waiting on a specific
     * question response before continuing.
     * 
     * questionId argument values are defined in constants.js.
     */
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

    /**
     * Take the skill's state out of question mode.
     */
    this.exitQuestionMode = function() {
        clearActiveQuestion.call(this);
        this.underlyingHandlerContext.handler.state = appStates.DEFAULT;
    }

    /**
     * Returns the quesiton mode "enum" that is currently active.
     */
    this.getActiveQuestion = function() {
        return this.underlyingHandlerContext.attributes["activeQ"];
    }

    /**************************
     * Playback state persistence
     ***************************/

    /**
     * Saves a PlaybackState object.
     */
    this.setPlaybackState = function(pbState) {
        this.underlyingHandlerContext.attributes["pb"] = pbState;
    }

    /**
     * Returns a PlaybackState object.
     */
    this.getPlaybackState = function() {
        return this.underlyingHandlerContext.attributes["pb"];
    }

    /**
     * Removes the current PlaybackState object from persistence
     */
    this.clearPlaybackState = function() {
        delete this.underlyingHandlerContext.attributes["pb"];
    }

    /**************************
     * User listening history 
     ***************************/

    /**
     * Save the index of latest favorite episode started for a paricular show
     */
    this.setLatestFavoriteStart = function(showId, indexPlayed) {
        getHistory.call(this).favs[showId] = indexPlayed;
    }

    /**
     * Returns the index of the latest favorite episode started for a paricular show
     */
    this.getLatestFavoriteStart = function(showId) {
        return getHistory.call(this).favs[showId];
    }

    /**
     * Save the index of latest serialized episode completed for a paricular show
     */
    this.setLatestSerialFinished = function(showId, indexPlayed) {
        getHistory.call(this).serials[showId] = indexPlayed;
    }

    /**
     * Returns the index of latest serialized episode completed for a paricular show
     */
    this.getLatestSerialFinished = function(showId) {
        return getHistory.call(this).serials[showId];
    }

    /**
     * Generic "getter" for storing a persistent attribute
     */
    this.getAttr = function(key) {
        return this.underlyingHandlerContext.attributes[key];
    }

    /**
     * Generic "setter" for storing a persistent attribute
     */
    this.setAttr = function(key, val) {
        this.underlyingHandlerContext.attributes[key] = val;
    }
 
    /**
     * Generic function for deleting a persistent attribute set in `setAttr`.
     */
    this.clearAttr = function(key) {
        delete this.underlyingHandlerContext.attributes[key];
    }
}

/**
 * "Private" methods, intended to be called with RequestModel instance as "this"
 */

function setActiveQuestion(questionId) {
    this.underlyingHandlerContext.attributes["activeQ"] = questionId;
}

function clearActiveQuestion() {
    delete this.underlyingHandlerContext.attributes["activeQ"];
}

/**
 * Ensures our "history" object is initialized with a standard schema.
 */
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
