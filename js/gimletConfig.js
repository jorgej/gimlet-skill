module.exports = Object.freeze({
    // Note: The value of each ShowId is the "display version" of the show name, which has spaces and capitalization as found at Gimlet's website. 
    ShowId: {
        CrimeTown:              "Crime Town",
        Homecoming:             "Homecoming",
        Undone:                 "Undone",
        ReplyAll:               "Reply All",
        StartUp:                "StartUp",
        ScienceVs:              "Science Vs",
        Heavyweight:            "Heavyweight",
        SurprisinglyAwesome:    "Surprisingly Awesome",
        Sampler:                "Sampler"
    },

    // Note: These keys should be the same as the values of ShowId. (Ideally, we'd use ShowId.CrimeTown, for example, instead of the string value).
    feedUrl: {
        "Crime Town":           "http://feeds.gimletmedia.com/crimetownshow",
        "Homecoming":           "http://feeds.gimletmedia.com/homecomingshow",
        "Undone":               "http://feeds.gimletmedia.com/undoneshow",
        "Reply All":            "http://feeds.gimletmedia.com/hearreplyall",
        "StartUp":              "http://feeds.gimletmedia.com/hearstartup",
        "Science Vs":           "http://feeds.gimletmedia.com/sciencevs",
        "Heavyweight":          "http://feeds.gimletmedia.com/heavyweightpodcast",
        "Surprisingly Awesome": "http://feeds.gimletmedia.com/surprisinglyawesome",
        "Sampler":              "http://feeds.gimletmedia.com/samplershow"
    }
});
