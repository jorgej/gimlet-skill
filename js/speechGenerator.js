module.exports = function(key, ...args) {
    var speech = {
        "ReplyAllIntroduction":     text(`Check out this episode of Reply All!`),
        "CurrentlyPlayingEpisode":  text(`Now playing episode ${args[0]} of ${args[1]}`),
        "SomethingWithAudio":       audio(`https://carfu.com/audio/carfu-welcome.mp3`)
    };
    return speech[key];
};

function text(text) {
    return `${text}`;
}

function audio(url) {
    return `<audio src="${url}" />`;
}
