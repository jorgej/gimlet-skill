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

const feedMap = {
    "crimetown": standardFeedUrl("crimetownshow"),
    "heavyweight": standardFeedUrl("heavyweightpodcast"),
    "homecoming": standardFeedUrl("homecomingshow"),
    "mysteryshow": standardFeedUrl("mysteryshow"),
    "replyall": standardFeedUrl("hearreplyall"),
    "sciencevs": standardFeedUrl("sciencevs"),
    "startup": "https://feeds.feedburner.com/hearstartup",
    "sampler": standardFeedUrl("samplershow"),
    "surprisinglyawesome": standardFeedUrl("surprisinglyawesome"),
    "twiceremoved": standardFeedUrl("twiceremovedshow"),
    "undone": standardFeedUrl("undoneshow")
};

const favoritesMap = require("./favorites");

module.exports = {
    shows: shows,
    
    feedUrl: function(show) {
        return feedMap[show.id];
    },
    
    favorites: function(show) {
        return favoritesMap[show.id];
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


function makeShow(title) {
    return {
        id: title.replace(/\s/g, '').toLowerCase(), 
        title: title
    }
}


function standardFeedUrl(showKey) {
    return `http://feeds.gimletmedia.com/${showKey}`;
}

