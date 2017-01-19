"use strict";

const gimlet = require('./gimlet');
const PlaybackState = require("./playbackState");
const ContentToken = require('./token');
const speaker = require("./speaker");
const rss = require('rss-parser');

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

function startPlayingMostRecent(response, showId) {
    // TODO: necessary to nest promises?
    return getFeedEntries(showId).then(entries => {
        const entry = entries[entries.length-1];
        if (!entry) {
            throw new Error(`No episodes found for showId "${showId}"`);
        }

        // Alexa only plays HTTPS urls, feeds give us HTTP ones
        const contentUrl = entry.enclosure.url.replace('http://', 'https://');
        
        const token = ContentToken.createLatest(showId);

        const intro = speaker.introduceMostRecent(showId);
        const showTitle = gimlet.titleForShow(showId);
        response.speak(intro)
                .cardRenderer(`Playing ${showTitle}`, 
                            `Now playing the most recent episode of ${showTitle}, "${entry.title}".`);

        const pbState = beginPlayback(response, contentUrl, token);
        return pbState;
    })
}

function startPlayingSerial(response, showId, lastFinishedIndex) {
    return getFeedEntries(showId, isFullLengthEpisode).then(entries => {
        if (!entries.length) {
            throw new Error(`No episodes found for showId "${showId}"`);
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
        response.cardRenderer(`Playing ${showTitle}`, 
                            `Now playing the next episode of ${showTitle}, "${entry.title}".`);

        const pbState = beginPlayback(response, contentUrl, token);
        return pbState;
    });
}

function startPlayingFavorite(response, showId, favoriteIndex) {
    return gimlet.getFavoritesMap().then(favoritesMap => {
        if (!favoritesMap) {
            throw new Error("No favorites configured");
        }

        const favs = favoritesMap[showId];
        if (!favs) {
            throw new Error(`No favorites configured for showId "${showId}"`);
        }

        // ensure index fits in range of avaialble favorites
        favoriteIndex = favoriteIndex % favs.length;

        let fav = favs[favoriteIndex];
        if (!fav) {
            throw new Error(`No favorites configured for showId "${showId}"`);
        }

        const contentUrl = fav.content;        
        const token = ContentToken.createFavorite(showId, favoriteIndex);

        const intro = speaker.introduceFavorite(showId);
        const showTitle = gimlet.titleForShow(showId);

        let cardContent = `Now playing a staff-favorite episode of ${showTitle}.`
        if (fav.title) {
            cardContent += `, "${fav.title}"`
        }

        response.speak(intro)
                .cardRenderer(`Playing ${showTitle}`, cardContent);

        const newPbState = beginPlayback(response, contentUrl, token);
        return newPbState;
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

// resolve arugment: [entry]. sorted in increasing order by time (i.e. [0] is first posted episode)
function getFeedEntries(showId, filterFn) {
    return gimlet.getFeedMap().then(feedMap => {
        if (!feedMap[showId]) {
            throw new Error("Problem getting feed URL");
        }
        const url = feedMap[showId];

        // wrap this callback-based API in a promise
        return new Promise((resolve, reject) => {        
            rss.parseURL(url, function(err, parsed) {
                if (err) {
                    reject(new Error("Problem fetching RSS feed"));
                }
                
                let entries = parsed.feed.entries;
                entries.reverse();

                if (filterFn) {
                    entries = entries.filter(filterFn);
                }
                resolve(entries);
            });
        });
    });
}

