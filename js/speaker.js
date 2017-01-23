/**
 * speaker.js
 * Author: Greg Nicholas
 * 
 * Contains configuration for all content spoken by Alexa.
 */

"use strict";

module.exports = {
    // most static speech comes from here
    get: getKeyedSpeech,

    getQuestionSpeech: getQuestionSpeech,

    // speech that requires arguments
    introduceMostRecent: introduceMostRecent,
    introduceSerial: introduceSerial,
    askToResume: askToResume
};

/**
 * Returns speech identified by a particular key. Most speech used in the skill
 * is configured here.
 * 
 * Value returned will either be a string containing plain text, or SSML.
 */
function getKeyedSpeech(key) {
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

        "NextUnsupported":      "Sorry, I can only perform this operation on serialized shows",
        "UnsupportedOperation": audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Unsupported+Operation.mp3"),

        // TODO: track
        "EpisodeNotFound":      "Sorry, I couldn't find that episode.",
        "Error":                "Sorry, I ran into a problem. Please try again later.",

        "_Unhandled":           audio("https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Did+Not+Understand.mp3")
    };

    return speech[key];
};

// types: 'original', 'help', 'reprompt', 'unhandled'

/**
 * Returns speech content related to a particular "question state" the skill is in.
 * Four possible question "types" can be returned:
 * - "original": The original question to be asked to the user
 * - "help": A message for when the user asks for help in response to the question
 * - "reprompt": A message spoken when the question must be asked again (e.g. in
 *      response to silence by the user)
 * - "unhandled": A message for when the user responds to a question with an 
 *      irrelevant intent
 * 
 * Arguments:
 * - question: String, a question mode identifier (defined in constants.js)
 * - type: String, question type, described above
 */
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

/**
 * Returns speech to introduce the latest episode of a particular show.
 */
function introduceMostRecent(showId) {
    if (urlSuffixMap[showId]) {
        return audio(standardMostRecentUrl(urlSuffixMap[showId]));
    }
    else {
        // TODO: handle erroneous arg with Alexa speech?
        return "";
    }
}

/**
 * Returns speech to introduce an episode of a serialized show.
 */
function introduceSerial(showId) {
    // TODO: track this?
    return "";
}

/**
 * Returns speech to ask the user if they want to resume listening to a
 * particular show. If the show id is invalid, a generic response is returned.
 */
function askToResume(showId) {
    let url;
    if (showId) {
        url = `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Confirm+Resume+${urlSuffixMap[showId]}.mp3`
    }
    else {
        url = "https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Confirm+Resume+Help.mp3";
    }
    return audio(url);
}

/**
 * Helpers
 */

const urlSuffixMap = {
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

function audio(url) {
    return `<audio src="${url}" />`;
}

function standardMostRecentUrl(urlSuffix) {
    return `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Most+Recent+${urlSuffix}.mp3`
}

function standardFavoriteUrl(urlSuffix) {
    return `https://s3.amazonaws.com/amazon-alexa/Audio+Files/Prompts/Favorite+${urlSuffix}.mp3`
}
