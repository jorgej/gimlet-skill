module.exports = [
    new Show("crimetownshow", "Crime Town", []),
    new Show("homecomingshow", "Homecoming"),
    new Show("undoneshow", "Undone"),
    new Show("hearreplyall", "Reply All"),
    new Show("hearstartup", "StartUp"),
    new Show("sciencevs", "Science Vs"),
    new Show("heavyweightpodcast", "Heavyweight"),
    new Show("surprisinglyawesome", "Surprisingly Awesome"),
    new Show("samplershow", "Sampler"),
    new Show("mysteryshow", "Mystery Show")
];

function Show(id, title, slotValues, spokenTitle, url) {
    if(!id || !title) {
        throw new Error("Invalid Show params");
    }

    this.title = title;
    this.url = url;
    this.slotValues = slotValues || [title];
    this.spokenTitle = spokenTitle || title;
    this.url = url || feedURLFromId(id);

    if (!slotValues || !slotValues.length) {
        this.slotValues = [title];
    }
}

function feedURLFromId(id) {
    return `http://feeds.gimletmedia.com/${id}`;
}
