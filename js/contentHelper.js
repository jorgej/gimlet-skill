/**
 * contentHelper.js
 * Author: Greg Nicholas
 * 
 * Contains helper functions for retreiving Gimlet podcasts.
 */

"use strict";

const gimlet = require('./gimlet');
const rss = require('rss-parser');

const _EpisodeRangeError = 'EpisodeRangeError';

module.exports = {
    fetchLatestEpisode: fetchLatestEpisode,
    fetchSerialEpisode: fetchSerialEpisode,
    fetchFavoriteEpisode: fetchFavoriteEpisode,

    // name used in Error subclass
    EpisodeRangeErrorName: _EpisodeRangeErrorName
};

/**
 * Error subclass used when a desired episode index is out of range. 
 * e.g. When episode[6] is requested in a feed that only has 6 episodes.
 */
function EpisodeRangeError(index) {
    this.name = _EpisodeRangeErrorName;
    this.message = `No episode at index ${index} exists`;
    this.stack = (new Error()).stack;
}
EpisodeRangeError.prototype = new Error;

/**
 * Returns a promise for an object describing the latest episode of
 * the given show.
 * 
 * - showId: String
 * 
 * Resolved object contains the following:
 * { 
 *   url: String,
 *   title: String
 * }
 * 
 * On failure, the promise is rejected with an Error.
 */
function fetchLatestEpisode(showId) {
    return getFeedEntries(showId).then(entries => {
        const entry = entries[entries.length-1];
        if (!entry) {
            throw new Error(`No episodes found for showId "${showId}"`);
        }

        // Alexa only plays HTTPS urls, feeds give us HTTP ones
        const contentUrl = entry.enclosure.url.replace('http://', 'https://');
        
        return {
            url: contentUrl,
            title: entry.title,
        };
    });
}

/**
 * Returns a promise for an object describing a particular episode of
 * a given show. 
 * 
 * Arguments:
 * - showId: String
 * - episodeIndex: Number. Zero-based index into feed.
 * - shouldLoopIndex: Boolean. If true, an index overflow will be wrapped around.
 * 
 * Resolved object contains the following:
 * { 
 *   url: String,
 *   title: String,
 *   index: Number. Index of episode (could differ from requested index if shouldLoopIndex=true)
 * }
 * 
 * On failure, the promise is rejected with an Error.
 */
function fetchSerialEpisode(showId, episodeIndex, shouldLoopIndex=true) {
    return getFeedEntries(showId, isFullLengthEpisode).then(entries => {
        if (!entries.length) {
            throw new Error(`No episodes found for showId "${showId}"`);
        }

        // if desired index is beyond what is available, either loop back or fail
        if (episodeIndex >= entries.length) {
            if (shouldLoopIndex) {
                episodeIndex = episodeIndex % entries.length;
            }
            else {
                throw new EpisodeRangeError(episodeIndex);
            }
        }

        const entry = entries[episodeIndex];

        // Alexa only plays HTTPS urls, feeds give us HTTP ones
        const contentUrl = entry.enclosure.url.replace('http://', 'https://');
        
        return {
            url: contentUrl,
            title: entry.title,
            index: episodeIndex
        }
    });
}

/**
 * Returns a promise for an object describing a favorite episode of
 * a given show. See gimlet.js for details about these hand-curated
 * favorites.
 * 
 * Arguments:
 * - showId: String
 * - episodeIndex: Number. Zero-based index into feed.
 * - shouldLoopIndex: Boolean. If true, an index overflow will be wrapped around.
 * 
 * Resolved object contains the following:
 * { 
 *   url: String,
 *   title: String,
 *   intro: String,
 *   index: Number. Index of episode (could differ from requested index if shouldLoopIndex=true)
 * }
 * 
 * On failure, the promise is rejected with an Error.
 */
function fetchFavoriteEpisode(showId, favoriteIndex, shouldLoopIndex=true) {
    return gimlet.getFavoritesMap().then(favoritesMap => {
        if (!favoritesMap) {
            throw new Error("No favorites configured");
        }

        const favs = favoritesMap[showId];
        if (!favs || !favs.length) {
            throw new Error(`No favorites configured for showId "${showId}"`);
        }

        // if desired index is beyond what is available, either loop back or fail
        if (favoriteIndex >= favs.length) {
            if (shouldLoopIndex) {
                favoriteIndex = favoriteIndex % favs.length;
            }
            else {
                throw new EpisodeRangeError(episodeIndex);
            }
        }

        const fav = favs[favoriteIndex];
        return {
            url: fav.content,
            title: fav.title,
            intro: fav.intro || "",
            index: favoriteIndex
        };
    });
}

/**
 * Helpers
 */


// resolve arugment: [entry]. sorted in increasing order by time (i.e. [0] is first posted episode)

/**
 * Reads the RSS feed for a given show. The feeds are returned in increasing order 
 * by time (i.e. [0] is first posted episode)
 * 
 * Returns a promise that resolves with an array of RSS entries (format defined by 
 * rss-parser library). Promise will be rejected with an Error on failure.
 */
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

                // want entries to be sorted in chronolgical order
                entries.reverse();

                if (filterFn) {
                    entries = entries.filter(filterFn);
                }
                resolve(entries);
            });
        });
    });
}

/**
 * Filter function used in `getFeedEntries`. Rejects all RSS feed entries 
 * for audio with a duration shorter than 4 minutes.
 */
function isFullLengthEpisode(rssEntry) {
    const durationInSec = rssEntry['itunes'] && rssEntry['itunes']['duration'];
    if (durationInSec == undefined) {
        return true;    // default to true if no duration can be found
    }
    else {
        return durationInSec > 240;
    }
}
