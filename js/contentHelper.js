"use strict";

const gimlet = require('./gimlet');
const rss = require('rss-parser');

module.exports = {
    fetchLatestEpisode: fetchLatestEpisode,
    fetchSerialEpisode: fetchSerialEpisode,
    fetchFavoriteEpisode: fetchFavoriteEpisode
};

function fetchLatestEpisode(response, showId) {
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

function fetchSerialEpisode(response, showId, episodeIndex, shouldLoopIndex=true) {
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
                throw new Error(`No episode #${episodeIndex} exists`);
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

function fetchFavoriteEpisode(response, showId, favoriteIndex, shouldLoopIndex=true) {
    return gimlet.getFavoritesMap().then(favoritesMap => {
        if (!favoritesMap) {
            throw new Error("No favorites configured");
        }

        const favs = favoritesMap[showId];
        if (!favs) {
            throw new Error(`No favorites configured for showId "${showId}"`);
        }

        // if desired index is beyond what is available, either loop back or fail
        if (favoriteIndex >= favs.length) {
            if (shouldLoopIndex) {
                favoriteIndex = favoriteIndex % favs.length;
            }
            else {
                throw new Error(`No favorite exists at index ${episodeIndex}`);
            }
        }

        let fav = favs[favoriteIndex];
        if (!fav) {
            throw new Error(`No favorites configured for showId "${showId}"`);
        }

        return {
            url: fav.content,
            title: fav.title,
            index: favoriteIndex
        };
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

