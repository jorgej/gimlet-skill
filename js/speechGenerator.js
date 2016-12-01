module.exports = function(key, ...args) {

    var text;

    switch (key) {
        case "ReplyAllIntroduction":
            text = "Check out this episode of Reply All!";
            break;
        case "PlayingShow":
            if (args.length == 1) {
                var nameOfShow = args[0];
                text = `Playing ${nameOfShow}.`;
            }
            else {
                console.log(`Error: speechGenerator's PlayingShow case was expecting one argument (found ${args.length} arguments).`);
                // TODO: Handle unexpected number of arguments (e.g. none). Should this be an assert, since it would be a programmer error?
                return undefined;
            }
            break;
        case "SomethingWithManyArguments":  // TODO: Remove this sample case
            if (args.length > 0) {
                text = `Let me tell you about ${args[0]}`;
                args.forEach(function(arg, index) {
                    if (index > 0) { // Skip the first argument, since we included it in the initial line above.
                        text += `and ${arg}`;
                    }
                });
            }
            else {
                // TODO: Handle unepxected number of arguments
            }
            break;
        default:
            // TODO: Handle an invalid key.
            return undefined;
    }

    return createSSMLSpeechObjectFromText(text);
};

function createSSMLSpeechObjectFromText(text) {
    return {
        type: 'SSML',
        ssml: `<speak> ${text} </speak>`
    };
}
