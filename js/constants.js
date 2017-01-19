"use strict";

module.exports = Object.freeze({
    
    appId : 'amzn1.ask.skill.fb7cbf45-1f45-4307-b2ce-b36bc871625f',
    
    dynamoDBTableName : 'GimletMedia',

    voiceInsightsToken : '67ea3f10-ddb6-11a6-1b95-0e61e4c2ee12',
    // voiceInsightsToken : 'a773b2f0-ddb7-11a6-320b-0e2486876586',
    
    // Note: Some Amazon example code uses '' for the DEFAULT state as a way to coerce the user's 
    //  first interaction with the skill to be the DEFAULT state, but this won't work properly. That
    //  is because the Alexa SDK code will ignore all falsey values when persisting state. As a result
    //  you're never able transition back to the DEFAULT state.
    //
    // This Github issue says it works as intended, https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs/issues/21,
    //  but the intended behavior of ignoring a state change is ridiculous.
    //
    // We sidestep the issue by not using a blank string as the value for states.DEFAULT, and by explictly
    //  coercing all falsey state values to states.DEFAULT in our init code in `alexaplus.js`.
    states : {
        DEFAULT : '_DEFAULT',
        ASK_FOR_SHOW : '_ASK_FOR_SHOW',
        QUESTION_CONFIRM : '_QUESTION_CONFIRM',
        QUESTION_EXCLUSIVE_NUMBER: '_QUESTION_EXCLUSIVE_NUMBER'
    },

    questions : {
        FavoriteShowTitle: 'FavoriteShowTitle',
        MostRecentShowTitle: 'MostRecentShowTitle',
        ConfirmResumePlayback: 'ConfirmResumePlayback',
        ExclusiveNumber: 'ExclusiveNumber'
    }
});
