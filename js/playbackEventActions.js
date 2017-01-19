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

function playbackStarted(event, response, model) {
    // if this track is a favorite, we want to note it in the user's history
    const token = contentToken.createFromString(event.request.token);

    if (contentToken.isValid(token)) {
        model.setPlaybackState(playbackState.createState(token, 0));

        if (isFavoriteToken(token)) {
            model.setLatestFavoriteStart(token.info.showId, token.info.index);
        }
    }

    response.sendNil({saveState: true});
}

function playbackStopped(event, response, model) {
    const offset = event.request.offsetInMilliseconds;
    const token = contentToken.createFromString(event.request.token);

    if (contentToken.isValid(token) && offset !== undefined) {
        model.setPlaybackState(playbackState.createState(token, offset));
    }

    response.sendNil({saveState: true});
}

function playbackNearlyFinished(event, response, model) {
    // nothing to do here -- we don't support queuing in this version
    response.sendNil({saveState: false});
}

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

function playbackFailed(event, response) {
    response.sendNil({saveState: false});
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
