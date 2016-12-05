module.exports = function(key, ...args) {
    var speech = {
        "Welcome":          "Welcome to the Gimlet skill. You can say some fun stuff if you want.",
        "Welcome:Playback": "Welcome back! Here's where you left off.",
        
        "Help":             "I get by with a little help from my friends.",
        "Help:Playback":    "I get by with a little help from my friends.",
        "Help:AskForShow":  "To continue, name the show you would like to listen to.",
        
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
