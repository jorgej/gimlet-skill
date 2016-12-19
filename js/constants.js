"use strict";

module.exports = Object.freeze({
    
    appId : 'amzn1.ask.skill.fb7cbf45-1f45-4307-b2ce-b36bc871625f',
    
    dynamoDBTableName : 'GimletMedia',
    
    states : {
        DEFAULT : '',
        ASK_FOR_SHOW : '_ASK_FOR_SHOW',
        QUESTION_CONFIRM : '_QUESTION_CONFIRM'
    },

    questions : {
        FavoriteShowTitle: 'FavoriteShowTitle',
        MostRecentShowTitle: 'MostRecentShowTitle',
        ConfirmResumePlayback: 'ConfirmResumePlayback',
    }
});
