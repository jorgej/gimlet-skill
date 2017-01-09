'use strict';

const constants = require("./constants");
const appStates = constants.states;
const PlaybackState = require("./playbackState");

// TODO: Note that session must be saved after these calls for them to work. how can we enforce this?

module.exports = function(response, model) {
    return {
        start: function(track, offset) {
            let state;
            if (offset) {
                state = new PlaybackState(track, offset);
            }
            else {
                state = new PlaybackState(track);
            }
            model.set('playbackState', state);
            this.resume();
        },
        stop: function() {
            response.audioPlayerStop();
        },
        resume: function() {
            const playbackState = model.get('playbackState');
            // TODO: support mark/isFinished methods again
            if (playbackState && !isFinished(playbackState)) {
                response.audioPlayerPlay("REPLACE_ALL", 
                    playbackState.track.url, 
                    playbackState.track.url,
                    null, 
                    playbackState.offset);
                return true;
            }
            return false;
        },
        restart: function() {
            const playbackState = model.get('playbackState');
            if (playbackState) {
                this.start(playbackState.track);
                return true;
            }
            return false;
        },
        clear: function() {
            model.del("playbackState");
        },

        activeTrack: function() {
            const playbackState = model.get('playbackState');
            if (playbackState && !isFinished(playbackState)) {
                return playbackState.track;
            }
            else {
                return undefined;
            }
        },

        onPlaybackStarted: function() {
            // nothing to do with pb state
        },
        onPlaybackStopped: function(offset) {
            const playbackState = model.get('playbackState');
            if (playbackState) {
                playbackState.offset = offset;
            }
        },
        onPlaybackFinished: function() {
            const playbackState = model.get('playbackState');
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
