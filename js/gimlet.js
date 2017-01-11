'use strict';

const _ = require("lodash");

const shows = {
    CrimeTown: makeShow("Crime Town"),
    Heavyweight: makeShow("Heavyweight"),
    Homecoming: makeShow("Homecoming"),
    MysteryShow: makeShow("Mystery Show"),
    ReplyAll: makeShow("Reply All"),
    ScienceVs: makeShow("Science Vs"),
    StartUp: makeShow("StartUp"),
    Sampler: makeShow("Sampler"),
    SurprisinglyAwesome: makeShow("Surprisingly Awesome"),
    TwiceRemoved: makeShow("Twice Removed"),
    Undone: makeShow("Undone")
};

module.exports = {
    shows: shows,
    
    getFeedMap: function(callback) {
        fetchJSONData('https://s3.amazonaws.com/amazon-alexa/sources/feeds.json', callback);
    },

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
        // first built a list of valid patterns we'll accept for each show
        const showSlotPatterns = {};
        
        // by default, just use lowercase version of title
        _.keys(shows).forEach(key => {
            showSlotPatterns[key] = [shows[key].title.toLowerCase()];
        });

        // explicitly add some common aliases
        showSlotPatterns.Heavyweight = ["heavyweight", "heavy weight", "heavyweights", "heavy weights"];
        showSlotPatterns.ScienceVs = ["science vs", "science versus"];
        showSlotPatterns.StartUp = ["startup", "start up"];

        const targetVal = slotValue.toLowerCase();
        const matchingKey = _.keys(shows).find(key => {
            return _.includes(showSlotPatterns[key], targetVal);
        });
        return shows[matchingKey];
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

function makeShow(title) {
    return {
        id: title.replace(/\s/g, '').toLowerCase(), 
        title: title
    }
}
