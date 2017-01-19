'use strict';

const _ = require("lodash");

module.exports = {
    shows: shows,
    
    titleForShow: function(showId) {
        return titleMap[showId];
    },

    isSerialShow: function(showId) {
        return showId === 'homecoming' || showId === 'crimetown';
    },

    getFeedMap: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/feeds.json');
    },

    getFavoritesMap: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/favorites.json');
    },

    getExclusives: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/exclusives.json');
    },

    getMLIs: function() {
        return fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/mattliebris.json');
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
