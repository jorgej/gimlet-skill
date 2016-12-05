module.exports = {
    CrimeTown: new Show("crimetownshow", "Crime Town"),
    Heavyweight: new Show("heavyweightpodcast", "Heavyweight", ["heavyweight", "heavy weight", "heavyweights", "heavy weights"]),
    HomecomeShow: new Show("homecomingshow", "Homecoming"),
    MysteryShow: new Show("mysteryshow", "Mystery Show"),
    ReplyAll: new Show("hearreplyall", "Reply All"),
    ScienceVs: new Show("sciencevs", "Science Vs", ["science vs", "science versus"]),
    StartUp: new Show("hearstartup", "StartUp", ["startup", "start up"]),
    Sampler: new Show("samplershow", "Sampler"),
    SurprisinglyAwesome: new Show("surprisinglyawesome", "Surprisingly Awesome"),
    TwiceRemoved: new Show("twiceremovedshow", "Twice Removed"),
    Undone: new Show("undoneshow", "Undone"),
};

function Show(id, title, slotValues, spokenTitle, url) {
    if(!id || !title) {
        throw new Error("Invalid Show params");
    }

    this.title = title;
    this.spokenTitle = spokenTitle || title;
    this.url = url || feedURLFromId(id);
    this.slotValues = slotValues;
    
    if (!slotValues || !slotValues.length) {
        this.slotValues = [title.toLowerCase()];
    }
}

function feedURLFromId(id) {
    return `http://feeds.gimletmedia.com/${id}`;
}
