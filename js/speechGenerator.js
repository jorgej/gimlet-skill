module.exports = function(key, ...args) {

    var text;

    switch (key) {
        case "ReplyAllIntroduction":
            text = "Check out this episode of Reply All!";
            break;
        case "PlayingShow":
            if (args.length === 1) {
                var nameOfShow = args[0];
                text = `Playing ${nameOfShow}.`;
            }
            else {
                logUnexpectedArgumentsCount(key, args.length, 1);
                // TODO: Should this be an assert, since it would be a programmer error?
                return undefined;
            }
            break;
        case "SomethingWithManyArguments":  // TODO: Remove this sample case
            if (args.length > 0) {
                text = `Let me tell you about ${args[0]}`;
                args.forEach(function(arg, index) {
                    if (index > 0) { // Skip the first argument, since we included it in the initial line above.
                        text += ` and ${arg}`;
                    }
                });
            }
            else {
                logUnexpectedArgumentsCount(key, args.length, "1 or more");
                // TODO: Should this be an assert, since it would be a programmer error?
                return undefined;
            }
            break;
        default:
            console.log(`Error: speechGenerator encountered unexpected key "${key}"`);
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

function logUnexpectedArgumentsCount(key, argsCount, expectedArgsCount) {
    console.log(`Error: speechGenerator encountered ${argsCount} argument(s), but was expecting ${expectedArgsCount} argument(s) for key "${key}".`);
}
