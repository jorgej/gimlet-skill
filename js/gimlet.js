/**
 * gimlet.js
 * Author: Greg Nicholas
 * 
 * Contains fixed information about Gimlet shows and operations
 * for fetching resources.
 */

"use strict";

const _ = require("lodash");

const showIds = [
    'crimetown',
    'heavyweight',
    'homecoming',
    'mysteryshow',
    'replyall',
    'sciencevs',
    'startup',
    'sampler',
    'surprisinglyawesome',
    'twiceremoved',
    'undone'
];

module.exports = {

    showIds: showIds,
    
    /**
     * Returns the full properly formatted title for a given show.
     */
    titleForShow: function(showId) {
        return titleMap[showId];
    },

    /**
     * Return true is the given show ID is for a serialized show.
     */
    isSerialShow: function(showId) {
        return showId === 'homecoming' || showId === 'crimetown';
    },

    /**
     * Returns an async promise for an object mapping of show IDs to RSS feed urls
     */
    getFeedMap: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/feeds.json');
    },
    
    /**
     * Returns an async promise for an object mapping of show IDs to arrays of "favorite" 
     * objects. These favorites have the following format:
     * { 
     *   content: String (mp3 url),
     *   title: String
     *   intro: String (optional, mp3 url of audio introducing episode)
     * }
     */
    getFavoritesMap: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/favorites.json');
    },

    /**
     * Returns an async promise for an array of "exclusive" objects. These exlusives have the 
     * following format:
     * { 
     *   content: String (mp3 url),
     *   title: String
     *   intro: String (optional, url for Alexa-friendly mp3 of audio introducing episode)
     * }
     */
    getExclusives: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/exclusives.json');
    },

    /**
     * Returns an async promise for an array of string URLs of "Matt Lieber is..." clips. 
     * These URLs should point to Alexa-friendly mp3 files.
     */
    getMLIs: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/mattlieberis.json');
    },

    /**
     * Matches the user-spoken raw value inside a "ShowTitle" slot to a canonical 
     * show ID. 
     * 
     * Some basic logic exists to match common special cases, for example:
     * "science versus" => "sciencevs"
     * "heavy weights" => "heavyweight"
     */
    showMatchingSlotValue: function(slotValue) {
        // first build a list of valid patterns we'll accept for each show based on their English titles
        const showSlotPatterns = _.mapValues(titleMap, function(title) {
            return [title.toLowerCase()];
        });

        // explicitly set some common aliases that differ from the title
        showSlotPatterns["heavyweight"] = ["heavyweight", "heavy weight", "heavyweights", "heavy weights"];
        showSlotPatterns["sciencevs"] = ["science vs", "science versus"];
        showSlotPatterns["startup"] = ["startup", "start up"];

        const targetVal = slotValue.toLowerCase();
        // look through the show Ids for a pattern that matches
        return showIds.find(showId => {
            return _.includes(showSlotPatterns[showId], targetVal);
        });
    }
};

/**
 * Config and helpers
 */

const titleMap = {
    crimetown: 'Crime Town',
    heavyweight: 'Heavyweight',
    homecoming: 'Homecoming',
    mysteryshow: 'Mystery Show',
    replyall: 'Reply All',
    sciencevs: 'Science Vs',
    startup: 'StartUp',
    sampler: 'Sampler',
    surprisinglyawesome: 'Surprisingly Awesome',
    twiceremoved: 'Twice Removed',
    undone: 'Undone'
};

function fetchJSONData(url) {
    const request = require("request");
    return new Promise((resolve, reject) => {
        request(url, (err, response, body) => {
            if (err) {
                reject(err);
            }
            else if(response.statusCode !== 200) {
                reject(new Error(`HTTP response code ${response.statusCode}`));
            } 
            else {
                try {
                    resolve(JSON.parse(body));
                }
                catch (e) {
                    reject(e);
                }
            }
        });
    });
}
