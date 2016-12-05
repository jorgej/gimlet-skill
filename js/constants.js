"use strict";

module.exports = Object.freeze({
    
    appId : 'amzn1.ask.skill.fb7cbf45-1f45-4307-b2ce-b36bc871625f',
    
    //  DynamoDB Table name
    dynamoDBTableName : 'GimletMedia',
    
    /*
     *  States:
     *  START_MODE : Welcome state when the audio list has not begun.
     *  PLAY_MODE :  When a playlist is being played. Does not imply only active play.
     *               It remains in the state as long as the playlist is not finished.
     *  RESUME_DECISION_MODE : When a user invokes the skill in PLAY_MODE with a LaunchRequest,
     *                         the skill provides an option to resume from last position, or to start over the playlist.
     */
    states : {
        START_MODE : '_START_MODE',
        PLAY_MODE : '_PLAY_MODE',
        RESUME_DECISION_MODE : '_RESUME_DECISION_MODE'
    },

    intents: {
        PlayLatest: 'PlayLatest',
        PlayFavorite: 'PlayFavorite',
        PlayExclusive: 'PlayExclusive',
    },

    slots: {
        ShowTitle: 'ShowTitle'
    }
});
