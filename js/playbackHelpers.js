"use strict";

const gimlet = require('./gimlet');
const PlaybackState = require("./playbackState");

module.exports = {
    beginPlayback: beginPlayback,
    restartPlayback: restartPlayback,
    resumePlayback: resumePlayback,

    startPlayingMostRecent: startPlayingMostRecent,
    startPlayingSerial: startPlayingSerial,
    startPlayingFavorite: startPlayingFavorite
}

function beginPlayback(response, url, contentToken) {
    const pbState = new PlaybackState(url, contentToken.toString(), 0);
    return resumePlayback(response, pbState);
}

function restartPlayback(response, pbState) {
    if (pbState.isValid()) {
        pbState.offset = 0;
        return resumePlayback(response, pbState);
    }
    return undefined;
}

function resumePlayback(response, pbState) {
    if (pbState.isValid() && !pbState.isFinished()) {
        response.audioPlayerPlay('REPLACE_ALL', pbState.url, pbState.token, null, pbState.offset);
        return pbState;
    }
    return undefined;
}

function startPlayingMostRecent(showId, response, callback) {
    gimlet.getFeedEntries(showId, function(entries, err) {
        if (err) {
            callback(undefined, err);
            return;
        }

        const entry = entries[entries.length-1];
        if (!entry) {
            callback(undefined, new Error(`No episodes found for showId "${showId}"`));
            return;
        }

        // Alexa only plays HTTPS urls, feeds give us HTTP ones
        const contentUrl = entry.enclosure.url.replace('http://', 'https://');
        
        const token = ContentToken.createLatest(showId);

        const intro = speaker.introduceMostRecent(showId);
        const showTitle = gimlet.titleForShow(showId);
        response.speak(intro)
                .cardRenderer(`Playing ${showTitle}`, 
                              `Now playing the most recent episode of ${showTitle}, "${entry.title}"`);

        const pbState = beginPlayback(response, contentUrl, token);
        callback(pbState);
    });
}

function startPlayingSerial(response, showId, lastFinishedIndex, callback) {
    gimlet.getFeedEntries(showId, isFullLengthEpisode, function(entries, err) {
        if (err) {
            callback(undefined, err);
            return;
        }
        else if (!entries.length) {
            callback(undefined, new Error(`No episodes found for showId "${showId}"`));
            return;
        }

        if (lastFinishedIndex === undefined) {
            lastFinishedIndex = -1;
        }

        // add one to the last index, cycling back to 0 at the end of the feed
        const nextIndex = (lastFinishedIndex + 1) % entries.length;
        const entry = entries[nextIndex];

        const intro = speaker.introduceSerial(showId);
        if (intro) {
            response.speak(intro);
        }

        // Alexa only plays HTTPS urls, feeds give us HTTP ones
        const contentUrl = entry.enclosure.url.replace('http://', 'https://');
        
        const token = ContentToken.createSerial(showId, nextIndex);
        
        const showTitle = gimlet.titleForShow(showId);
        response.cardRenderer(`Playing ${title}`, 
                              `Now playing the next episode of ${title}, "${entry.title}"`);

        const pbState = beginPlayback(response, contentUrl, token);
        callback(pbState);
    });
}

function startPlayingFavorite(response, showId, favoriteIndex, callback) {
    gimlet.getFavoritesMap(function(favoritesMap, err) {
        if (err || !favoritesMap) {
            callback(undefined, err || new Error("No favorites configured"));
            return;
        }

        const favs = favoritesMap[showId];
        if (!favs) {
            callback(undefined, new Error(`No favorites configured for showId "${showId}"`));
            return;
        }

        // ensure index fits in range of avaialble favorites
        favoriteIndex = favoriteIndex % favs.length;

        let fav = favs[favoriteIndex];
        if (!fav) {
            callback(undefined, new Error(`No favorites configured for showId "${showId}"`));
            return;
        }

        const contentUrl = fav.content;        
        const token = ContentToken.createFavorite(showId, favoriteIndex);

        const intro = speaker.introduceFavorite(showId);
        const showTitle = gimlet.titleForShow(showId);

        let cardContent = `Now playing a staff-favorite episode of ${title}`
        if (fav.title) {
            cardContent += `, "${fav.title}"`
        }

        response.speak(intro)
                .cardRenderer(`Playing ${title}`, cardContent);

        const newPbState = beginPlayback(response, contentUrl, token);
        callback(newPbState);
    });
}

function isFullLengthEpisode(rssEntry) {
    const durationInSec = rssEntry['itunes'] && rssEntry['itunes']['duration'];
    if (durationInSec == undefined) {
        return true;    // default to true if no duration can be found
    }
    else {
        return durationInSec > 240;
    }
}
