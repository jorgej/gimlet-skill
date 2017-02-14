/**
 * constants.js
 * Author: Greg Nicholas
 * 
 * Contains fixed values used in various places by the skill.
 */

"use strict";

module.exports = Object.freeze({
    
    appId : 'amzn1.ask.skill.e9cc574a-1216-4126-a4ea-03f11c25e104',
    
    dynamoDBTableName : 'GimletMedia',

    voiceInsightsToken : 'a773b2f0-ddb7-11a6-320b-0e2486876586',
    
    /**
     * Application states in this skill. For the most part, these states fall under
     * two categories: "normal" state and "question answering" state.
     */
    states : {
        // The skill is idle or not expecting anything particular from the user
        DEFAULT : '_DEFAULT',               

        // Alexa is asking the user to name a specific show
        ASK_FOR_SHOW : '_ASK_FOR_SHOW',

        // Alexa is asking the user a yes or no queston
        QUESTION_CONFIRM : '_QUESTION_CONFIRM',

        // Alexa is asking the user to select a numbered exclusive
        QUESTION_EXCLUSIVE_NUMBER: '_QUESTION_EXCLUSIVE_NUMBER'
    },

    // Note: Some Amazon example code uses '' for the DEFAULT state as a way to coerce the user's 
    //  first interaction with the skill to be the DEFAULT state, but this won't work properly. That
    //  is because the Alexa SDK code will ignore all falsey values when persisting state. As a result
    //  you're never able transition back to the DEFAULT state.
    //
    // This Github issue says it works as intended, https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/issues/21,
    //  but the intended behavior of ignoring a state change is ridiculous.
    //
    // We sidestep the issue by not using a blank string as the value for states.DEFAULT, and by explictly
    //  coercing all falsey state values to states.DEFAULT in our init code in `betterAlexa.js`.


    /**
     * Enum for questions that can be asked. Allows the context of an active question
     * to be kept alive over multiple requests. 
     * 
     * These values are used most frequently by the `getQuestionSpeech` method defined
     * in speaker.js.
     */
    questions : {
        FavoriteShowTitle: 'FavoriteShowTitle',
        MostRecentShowTitle: 'MostRecentShowTitle',
        ConfirmResumePlayback: 'ConfirmResumePlayback',
        ExclusiveNumber: 'ExclusiveNumber'
    }
});
