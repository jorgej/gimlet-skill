const ContentToken = require("./token");
const PlaybackState = require("./playbackState");

module.exports = {
    playbackStarted: playbackStarted,
    playbackStopped: playbackStopped,
    playbackNearlyFinished: playbackNearlyFinished,
    playbackFinished: playbackFinished,
    playbackFailed: playbackFailed,
}

function playbackStarted(event, response, model) {
    // if this track is a favorite, we want to note it in the user's history
    const token = ContentToken.fromString(event.request.token);

    if (token.url) {
        model.setPlaybackState(new PlaybackState(token.url, token, 0));
    }

    if (token.isValidFavoriteToken()) {
        model.setLatestFavoriteStart(token.showId, token.index);
    }

    response.exit(true);
}

function playbackStopped(event, response, model) {
    const offset = event.request.offsetInMilliseconds;
    const pbState = model.getPlaybackState();
    if (pbState.isValid() && offset !== undefined) {
        pbState.offset = offset;
        model.setPlaybackState(pbState);
    }
    response.exit(true);
}

function playbackNearlyFinished(event, response, model) {
    // nothing to do here -- we don't support queuing in this version
    response.exit(false);
}

function playbackFinished(event, response, model) {
    // mark playback as finished for the current track, but don't clear it in case 
    //  the user wants to issue a restart/previous/next command
    const pbState = model.getPlaybackState();
    if (pbState.isValid()) {
        pbState.markFinished();
        model.setPlaybackState(pbState);
    }

    // if this track is from a serial episode, we want to note it in the user's history
    const token = ContentToken.fromString(event.request.token);
    if (token.isValidSerialToken()) {
        model.setLatestSerialFinished(token.showId, token.index);
        response.exit(true);
    }
}

function playbackFailed(event, response) {
    response.exit(false);;
}
