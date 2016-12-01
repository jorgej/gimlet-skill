const parser = require('rss-parser');
const url = "http://feeds.gimletmedia.com/surprisinglyawesome";

exports.FetchFeed = function(feedName) {
    const p = new Promise(function(resolve, reject) {
        parser.parseURL(url, function(err, parsed) {
            if (err) {
                reject(err);
            }
            else {
                resolve(parsed.feed);
            }
        });
    });
    return p;
}
