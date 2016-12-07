'use strict';

module.exports = function(key) {

    // Convert `arguments` to a proper array and leave out the first argument (which is the parameter 'key'). This is a workaround for Lambda's lack of support for ES6 rest parameters (`...args`). See http://whatdoeslambdasupport.com/. 
    var args = Array.prototype.slice.call(arguments, 1);

    var speech = {
        "Welcome":                "Welcome to the Gimlet skill. You can say some fun stuff if you want.",
        "Welcome:ConfirmResume":  "Welcome back! Would you like to resume from where you left off?",
        
        "PromptToAction":       "You can say some fun stuff if you want.",

        "Help":                 "I get by with a little help from my friends.",
        "Help:Playback":        "I get by with a little help from my friends.",
        "Help:ConfirmResume":   "Say 'Yes' to resume playing from where you left off, or say 'No' to do something else.",
        "Help:AskForShow":      "To continue, name the show you would like to listen to.",
        
        "Goodbye":          "Ok see ya.",

        "EmptyQueueHelp" :  "Sorry, you don't have any podcast in progress at the moment.",

        "PlayingLatest":    `Here is the latest episode of ${args[0]}`,
        "PlayingFavorite":  `Here is a staff-favorite episode of ${args[0]}`,
        "PlayingExclusive": `Here is an exclusive clip from ${args[0]}`,

        "MattLieberIs":     "Matt Lieber is a guy who Tomer would like to meet.",
        "ShowList":         "Well, there's StartUp. And then that one with the Australian host. I love her accent. And um, the one with Ross?",
        "ShowListThenAsk":  "There's a bunch of them. Pick one.",

        "AskForShowTitle":       "What show would you like to listen to?",
        "RepromptForShowTitle":  "What show would you like to listen to?",
        "UnknownShowTitle":      "Hm, I don't know about that show. Could you name a Gimlet show?",

        "UnsupportedOperation": "Sorry, we do not support that operation.",

        "_Unhandled":       "Sorry, I don't know what to do about that.",
        "_Fail":            "Sorry, I've encountered a problem.",
    };

    return speech[key];
};

function audio(url) {
    return `<audio src="${url}" />`;
}
