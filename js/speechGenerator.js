module.exports = function(key, ...args) {
    var speech = {
        "Launch:START":     "Welcome to the Gimlet skill. You can say some fun stuff if you want.",
        "Launch:PLAY_MODE": "Welcome to the Gimlet skill. You can say some fun stuff if you want.",
        "Help:START":       "I get by with a little help from my friends.",

        "PlayingLatest":    `Here is the latest episode of ${args[0]}`,
        "PlayingFavorite":  `Here is a staff-favorite episode of ${args[0]}`,
        "PlayingExclusive": `Here is an exclusive clip from ${args[0]}`,

        "MattLieberIs":     "Matt Lieber is a guy who Tomer would like to meet.",
        
        "Goodbye":          "Ok I love you goodbye.",
        "AskForShowTitle":  "What show would you like to listen to?",
        
        "UnsupportedOperation": "Sorry, we do not support that operation.",
        "_Unhandled":       "Sorry, I don't know what to do about that.",
        "_Fail":            "Sorry, I've encountered a problem.",
    };

    return speech[key];
};

function audio(url) {
    return `<audio src="${url}" />`;
}
