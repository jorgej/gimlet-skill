'use strict';

module.exports = {
    // most static speech comes from here
    get: getKeyedSpeech,

    getQuestionSpeech: getQuestionSpeech,

    // speech that requires arguments
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
        
        "NotAuthorized":    "Sorry, but to use this skill, you must be a Gimlet member. To sign into your account, check your Alexa app.",
        
        "Goodbye":          "Ok see ya.",

        "EmptyQueueHelp" :  "Sorry, you don't have any podcast in progress at the moment.",

        "MattLieberIs":     "Matt Lieber is a guy who Tomer would like to meet.",
        "ShowList":         "Well, there's StartUp. And then that science one with the Australian host. And um, the one with Ross from Friends?",
        "ShowListThenAsk":  "Well, there's StartUp. And then that science one with the Australian host. And um, the one with Ross from Friends? Which one sounds good?",

        "UnsupportedOperation": "Sorry, we do not support that operation.",

        "_Unhandled":       "Sorry, I don't know what to do about that.",
    };

    return speech[key];
};

// types: 'original', 'help', 'reprompt', 'unhandled'
function getQuestionSpeech(question, type) {
    const pack = questionSpeechPacks[question];
    if (pack) {
        return pack[type];
    }
}

const questionSpeechPacks = {
    FavoriteShowTitle: {
        original: 'What show would you like to listen to?',
        help: 'What show would you like to listen to?',
        reprompt: 'What show would you like to listen to?',
        unhandled: "Sorry, I don't recognize that show. What show would you like to listen to?"
    },
    MostRecentShowTitle: {
        original: 'What show would you like to listen to?',
        help: 'What show would you like to listen to?',
        reprompt: 'What show would you like to listen to?',
        unhandled: "Sorry, I don't recognize that show. What show would you like to listen to?"
    },
    ConfirmResumePlayback: {
        original: "Would you like to continue where you left off?",     // not used
        help: "Say 'Yes' to resume playing from where you left off, or say 'No' to do something else.",
        reprompt: "Say 'Yes' to resume playing from where you left off, or say 'No' to do something else.",
        unhandled: "Sorry, I didn't get that. Would you like to resume from where you left off?"
    },
    ExclusiveNumber: {
        original: "I've got a 3 exclusives. Which one do you want do hear?",
        help: "I have 3 pieces of exclusive content, if you'd like to hear one, say either 'Number 1', '2', or '3'.",
        reprompt: "Which exclusive do you want to listen to? Say 1, 2, or 3.",
        unhandled: "Sorry, I didn't get that. Which exclusive do you want to hear?"
    }
}

const urlSuffixMap = {
    // Uncomment when these are live
    // "crimetown": "Crimetown",
    // "heavyweight": "Heavyweight",
    // "homecoming": "Homecoming",
    // "replyall": "Reply+All",
    // "sciencevs": "Science+Vs",
    // "startup": "StartUp",
    // "surprisinglyawesome": "Surprisingly+Awesome",
    // "twiceremoved": "Twice+Removed",
    // "undone": "Undone"
}

function introduceMostRecent(show) {
    if (urlSuffixMap[show.id]) {
        return audio(standardMostRecentUrl(urlSuffixMap[show.id]));
    }
    else {
        return `Here is the latest episode of ${show.title}`;
    }
}

function introduceFavorite(show, epTitle) {
    return `Here is a staff favorite episode of ${show.title}. It's called ${epTitle}`;
}

function askToResume(show) {
    if (show) {
        return `Welcome back! Would you like to continue the episode of ${show.title} you were listening to?`;
    }
    else {
        return "Welcome back! Would you like to continue where you left off?";
    }
}

function audio(url) {
    return `<audio src="${url}" />`;
}

function standardMostRecentUrl(urlSuffix) {
    return `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Most+recent+${urlSuffix}.mp3`
}