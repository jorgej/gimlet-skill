module.exports = {
    generate: function(key) {
        // ... return something depending on the key (and maybe fill in the args?) ...
        return createSSMLSpeechObjectFromText("testing 1 2 3");
    }
};

function createSSMLSpeechObjectFromText(text) {
    return {
        type: 'SSML',
        ssml: `<speak> ${text} </speak>`
    };
}
