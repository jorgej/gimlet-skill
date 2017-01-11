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
        readJSONSourceFile('feeds.json', callback);
    },

    getFavoritesMap: function(callback) {
        readJSONSourceFile('favorites.json', callback);
    },

    getExclusives: function(callback) {
        readJSONSourceFile('exclusives.json', callback);
    },

    getMLIs: function(callback) {
        readJSONSourceFile('mattlieberis.json', callback);
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

function readJSONSourceFile(filename, callback) {
    const fs = require("fs");
    const path = require("path");

    filename = path.join(__dirname, 'sources', filename);
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) {
            callback(undefined, err);
        }
        callback(JSON.parse(data));
    });
}

function makeShow(title) {
    return {
        id: title.replace(/\s/g, '').toLowerCase(), 
        title: title
    }
}
