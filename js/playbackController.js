const constants = require("./constants");
const appStates = constants.states;
const PlaybackState = require("./playbackState");

// TODO: Note that session must be saved after these calls for them to work. how can we enforce this?

module.exports = function(event) {
    return {
        start: function(track) {
            // TODO: consider getting rid of this state? its dangerous since it really should just be an
            //       artifact of the playbackState attr. too easy to get lost in a state hole by making 
            //       decisions based on this value 
            event.handler.state = appStates.PLAY_MODE;
            event.attributes['playbackState'] = new PlaybackState(track);
            this.resume();
        },
        stop: function() {
            event.response.audioPlayerStop();
        },
        resume: function() {
            const playbackState = event.attributes['playbackState'];
            // TODO: support mark/isFinished methods again
            if (playbackState && !isFinished(playbackState)) {
                event.response.audioPlayerPlay("REPLACE_ALL", 
                    playbackState.track.url, 
                    playbackState.track.url,
                    null, 
                    playbackState.offset);
                return true;
            }
            return false;
        },
        restart: function() {
            const playbackState = event.attributes['playbackState'];
            if (playbackState) {
                this.start(playbackState.track);
                return true;
            }
            return false;
        },

        onPlaybackStarted: function() {
            // nothing to do with pb state
        },
        onPlaybackStopped: function(offset) {
            const playbackState = event.attributes['playbackState'];
            if (playbackState) {
                playbackState.offset = offset;
            }
        },
        onPlaybackFinished: function() {
            const playbackState = event.attributes["playbackState"];
            if (playbackState) {
                markFinished(playbackState);
            }
        },
        onPlaybackNearlyFinished: function() {
            // nothing to do with pb state
        },
        onPlaybackFailed: function() {
            // nothing to do with pb state
        },
    };
};

function markFinished(playbackState) {
    playbackState.offset = Infinity;
}

function isFinished(playbackState) {
    return playbackState.offset === Infinity;
}
