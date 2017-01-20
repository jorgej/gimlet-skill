/**
 * playbackActions.js
 * Author: Greg Nicholas
 * 
 * Handlers for standard audio events sent by Alexa during long-form audio 
 * playback. We use these event notifications to manage playback state and
 * user listening history.
 */

"use strict";

const contentToken = require("./contentToken");
const playbackState = require("./playbackState");

module.exports = {
    playbackStarted: playbackStarted,
    playbackStopped: playbackStopped,
    playbackNearlyFinished: playbackNearlyFinished,
    playbackFinished: playbackFinished,
    playbackFailed: playbackFailed,
}

/**
 * Called when audio content begins. We do two things in response:
 * 1. Take note of the playback state in our saved attributes
 * 2. If the content is a favorite episode, we take note that the user has
 *    listened to it.
 */
function playbackStarted(event, response, model) {
    const token = contentToken.createFromString(event.request.token);

    if (contentToken.isValid(token)) {
        model.setPlaybackState(playbackState.createState(token, 0));

        if (isFavoriteToken(token)) {
            model.setLatestFavoriteStart(token.info.showId, token.info.index);
        }
    }

    response.sendNil({saveState: true});
}

/**
 * Called when audio content stops or is interrupted. We save the current
 * playback state to allow for resuming it later.
 */
function playbackStopped(event, response, model) {
    const offset = event.request.offsetInMilliseconds;
    const token = contentToken.createFromString(event.request.token);

    if (contentToken.isValid(token) && offset !== undefined) {
        model.setPlaybackState(playbackState.createState(token, offset));
    }

    response.sendNil({saveState: true});
}

/**
 * Called when audio is almost finished. This would be the place to queue up
 * the following track, but we don't support this yet.
 */
function playbackNearlyFinished(event, response, model) {
    response.sendNil();
}

/**
 * Called when audio content is complete. We update our internal playback state
 * and note the listening history if the show is serialized.
 */
function playbackFinished(event, response, model) {
    // mark playback as finished for the current track, but don't clear it in case 
    //  the user wants to issue a restart/previous/next command
    const pbState = model.getPlaybackState();
    if (pbState.isValid()) {
        playbackState.markFinished(pbState);
        model.setPlaybackState(pbState);
    }

    // if this track is from a serial episode, we want to note it in the user's history
    const token = contentToken.createFromString(event.request.token);
    if (isSerialToken(token)) {
        model.setLatestSerialFinished(token.showId, token.index);
    }

    response.sendNil({saveState: true});
}

/**
 * Called when there is a problem playing some audio. We don't react to this.
 */
function playbackFailed(event, response) {
    response.sendNil();
}

function isFavoriteToken(token) {
    return contentToken.isValid(token) &&
        token.type === contentToken.TYPES.FAVORITE &&
        !!token.url &&
        !!token.info.showId &&
        token.info.index !== undefined;
}

function isSerialToken(token) {
    return contentToken.isValid(token) &&
        token.type === contentToken.TYPES.SERIAL &&
        !!token.url &&
        !!token.info.showId &&
        token.info.index !== undefined;
}
