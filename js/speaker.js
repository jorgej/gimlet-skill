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
        "Welcome":              audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Welcome.mp3"),
        "NewUserWelcome":       audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/New+User+Welcome.mp3"),

        "WhatToDo":             audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/What+To+Do.mp3"),

        "Help":                 audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Help.mp3"),
        "Help2":                "Help Level 2",
        "Help3":                "Help Level 3",
        
        "LinkAccount":          audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Link+Account.mp3"),
        
        "Goodbye":              audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Goodbye.mp3"),

        "EmptyQueueMessage":    audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Empty+Queue+Message.mp3"),

        "ShowList":             audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Show+List.mp3"),

        "ExclusivePreamble":    audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Exclusive+Preamble.mp3"),
        "ExclusiveList":        audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Exclusive+List.mp3"),

        "UnsupportedOperation": audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Unsupported+Operation.mp3"),

        // TODO: track
        "Error":                "Sorry, I ran into a problem. Please try again later.",

        "_Unhandled":           audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Did+Not+Understand.mp3")
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
        original: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Favorite+Query.mp3"),
        help: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Favorite+Help.mp3"),
        reprompt: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Favorite+Query.mp3"),    // *
        unhandled: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Did+Not+Understand.mp3") +  // *
                    audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Favorite+Query.mp3")
    },
    MostRecentShowTitle: {
        original: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Most+Recent+Query.mp3"),
        help: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Most+Recent+Help.mp3"),
        reprompt: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Most+Recent+Query.mp3"), // *
        unhandled: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Did+Not+Understand.mp3") + // *
                    audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Most+Recent+Query.mp3")
    },
    ConfirmResumePlayback: {
        original: "Would you like to continue where you left off?",     // not used
        help: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Confirm+Resume+Help.mp3"),
        reprompt: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Confirm+Resume+Help.mp3"),   // *
        unhandled: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Did+Not+Understand.mp3") + // *
                    audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Confirm+Resume+Help.mp3")
    },
    ExclusiveNumber: {
        original: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Which+Exclusive.mp3"),   // *
        help: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Which+Exclusive+Help+1.mp3"),
        reprompt: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Which+Exclusive.mp3"),   // *
        unhandled: audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Did+Not+Understand.mp3") + // *
                    audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Which+Exclusive.mp3")
    }
}

const urlSuffixMap = {
    // Uncomment when these are live
    "crimetown": "Crimetown",
    "heavyweight": "Heavyweight",
    "homecoming": "Homecoming",
    "mysteryshow": "Mystery+Show",
    "replyall": "Reply+All",
    "sampler": "Sampler",
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
        // TODO: handle erroneous arg with Alexa speech?
        return "";
    }
}

function introduceFavorite(show) {
    if (urlSuffixMap[show.id]) {
        return audio(standardFavoriteUrl(urlSuffixMap[show.id]));
    }
    else {
        // TODO: handle erroneous arg
        return "";
    }
}

function introduceSerial(show) {
    // TODO: track this?
    return "";
}

function askToResume(show) {
    let url;
    if (show) {
        url = `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Confirm+Resume+${urlSuffixMap[show.id]}.mp3`
    }
    else {
        url = "https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Confirm+Resume+Help.mp3";
    }
    return audio(url);
}

function audio(url) {
    return `<audio src="${url}" />`;
}

function standardMostRecentUrl(urlSuffix) {
    return `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Most+Recent+${urlSuffix}.mp3`
}

function standardFavoriteUrl(urlSuffix) {
    return `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Favorite+${urlSuffix}.mp3`
}