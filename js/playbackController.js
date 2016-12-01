module.exports = function(eventHandler) {
    return {
        start: function(track) {console.log(`playing ${track.title}`)},
        pause: function() {/*...*/},
        resume: function() {/*...*/},
        restart: function() {/*...*/},
        play: function() {/*...*/},
    };
};
