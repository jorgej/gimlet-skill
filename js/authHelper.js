'use strict';

module.exports = {
    isSessionAuthenticated: isSessionAuthenticated,
};

function isSessionAuthenticated(session, callback) {
    if (session.user.accessToken) {
        const https = require('https');
        const accountURL = `https://gimletmedia.memberful.com/account.json?access_token=${session.user.accessToken}`;

        https.get(accountURL, function(response) {
            const didSucceed = (response.statusCode === 200);
            callback(didSucceed);
        });
    }
    else {
        callback(false);
    }
}
