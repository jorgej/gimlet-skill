'use strict';

module.exports = {
    get: getKeyedSpeech,
    introduceMostRecent: introduceMostRecent,
    introduceFavorite: introduceFavorite,
    askToResume: askToResume
};

function getKeyedSpeech(key) {

    // Convert `arguments` to a proper array and leave out the first argument (which is the parameter 'key'). This is a workaround for Lambda's lack of support for ES6 rest parameters (`...args`). See http://whatdoeslambdasupport.com/. 
    var args = Array.prototype.slice.call(arguments, 1);

    var speech = {
        "Welcome":                "Welcome back! What would you like to do?",
        "Welcome:FirstTime":       "Welcome to the Gimlet skill. What would you like to do?",
        "Welcome:NotAuthorized":    "Welcome to the Gimlet skill. To use it, you must be a Gimlet member. To sign into your account, check your Alexa app.",

        "PromptForNewAction":     "What would you like to do?",

        "Help":                 "I get by with a little help from my friends.",
        "Help:Playback":        "I get by with a little help from my friends.",
        "Help:ConfirmResume":   "Say 'Yes' to resume playing from where you left off, or say 'No' to do something else.",
        "Help:AskForShow":      "To continue, name the show you would like to listen to.",
        
        
        "NotAuthorized":            "Sorry, but to use this skill, you must be a Gimlet member. To sign into your account, check your Alexa app.",
        
        "Goodbye":          "Ok see ya.",

        "EmptyQueueHelp" :  "Sorry, you don't have any podcast in progress at the moment.",

        "PlayingExclusive": `Here is an exclusive clip from ${args[0]}`,

        "MattLieberIs":     "Matt Lieber is a guy who Tomer would like to meet.",
        "ShowList":         "Well, there's StartUp. And then that science one with the Australian host. And um, the one with Ross from Friends?",
        "ShowListThenAsk":  "Well, there's StartUp. And then that science one with the Australian host. And um, the one with Ross from Friends? Which one sounds good?",

        "AskForShowTitle":       "What show would you like to listen to?",
        "RepromptForShowTitle":  "What show would you like to listen to?",
        "UnknownShowTitle":      "Hm, I don't know about that show. Could you name a Gimlet show?",

        "UnsupportedOperation": "Sorry, we do not support that operation.",

        "UnhandledConfirmResume": "Sorry, I didn't get that. Would you like to resume from where you left off?", 

        "_Unhandled":       "Sorry, I don't know what to do about that.",
        "_Fail":            "Sorry, I've encountered a problem.",
    };

    return speech[key];
};

const urlSuffixMap = {
    "crimetown": "Crimetown",
    "heavyweight": "Heavyweight",
    "homecoming": "Homecoming",
    "replyall": "Reply+All",
    "sciencevs": "Science+Vs",
    "startup": "StartUp",
    "surprisinglyawesome": "Surprisingly+Awesome",
    "twiceremoved": "Twice+Removed",
    "undone": "Undone"
}

function introduceMostRecent(show) {
    if (urlSuffixMap[show.id]) {
        return audio(standardMostRecentUrl(urlSuffixMap[show.id]));
    }
    else {
        return `Here is the latest episode of ${show.title}`;
    }
}

function introduceFavorite(show) {
    return `Here is a staff favorite episode of ${show.title}`;
}

function askToResume(show) {
    return `Welcome back! Would you like to continue the episode of ${show.title} you were listening to?`;
}

function audio(url) {
    return `<audio src="${url}" />`;
}

function standardMostRecentUrl(urlSuffix) {
    return `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Most+recent+${urlSuffix}.mp3`
}