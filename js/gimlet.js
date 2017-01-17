'use strict';

const _ = require("lodash");

const shows = {
    CrimeTown: 'crimetown',
    Heavyweight: 'heavyweight',
    Homecoming: 'homecoming',
    MysteryShow: 'mysteryshow',
    ReplyAll: 'replyall',
    ScienceVs: 'sciencevs',
    StartUp: 'startup',
    Sampler: 'sampler',
    SurprisinglyAwesome: 'surprisinglyawesome',
    TwiceRemoved: 'twiceremoved',
    Undone: 'undone'
};

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

module.exports = {
    shows: shows,
    
    titleForShow: function(showId) {
        return titleMap[showId];
    },

    isSerialShow: function(showId) {
        return showId === 'homecoming' || showId === 'crimetown';
    },

    getFeedEntries: getFeedEntries,

    getFavoritesMap: function(callback) {
        fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/favorites.json', callback);
    },

    getExclusives: function(callback) {
        fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/exclusives.json', callback);
    },

    getMLIs: function(callback) {
        fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/mattlieberis.json', callback);
    },

    showMatchingSlotValue: function(slotValue) {
        // first build a list of valid patterns we'll accept for each show based on their English titles
        const showIds = _.values(shows);
        const showSlotPatterns = _.mapValues(titleMap, function(title) {
            return [title.toLowerCase()];
        });

        // explicitly set some common aliases that differ from the title
        showSlotPatterns["heavyweight"] = ["heavyweight", "heavy weight", "heavyweights", "heavy weights"];
        showSlotPatterns["sciencevs"] = ["science vs", "science versus"];
        showSlotPatterns["startup"] = ["startup", "start up"];

        const targetVal = slotValue.toLowerCase();
        // look through the show Ids for a pattern that matches
        return _.values(shows).find(showId => {
            return _.includes(showSlotPatterns[showId], targetVal);
        });
    }
};

function fetchJSONData(url, callback) {
    const request = require("request");
    request(url, (err, response, body)=> {
        if (!err && response.statusCode === 200) {
            callback(JSON.parse(body));
        } else {
            callback(undefined, err);
        }
    });
}

// callback arguments: ([entry], err)
function getFeedEntries(showId, filterFn, callback) {
    fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/feeds.json', function(feedMap, err) {
        if (err || !feedMap[showId]) {
            callback(undefined, new Error("Problem getting feed URL"));
            return;
        }
        
        const url = feedMap[showId];

        rss.parseURL(url, function(err, parsed) {
            if (err) {
                callback(undefined, new Error("Problem fetching RSS feed"));
                return;
            }

            if (!filterFn) {
                filterFn = function() { return true; }
            }
            
            let entries = parsed.feed.entries.reverse();
            entries.reverse();
            if (filterFn) {
                entries = entries.filter(filterFn);
            }
            callback(entries);
        });
    });
}
