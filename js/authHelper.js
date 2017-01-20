/**
 * authHelper.js
 * Author: Greg Nicholas
 * 
 * Contains helper functions for managing user authentication.
 */

"use strict";

module.exports = {
    isSessionAuthenticated: isSessionAuthenticated,
};

/**
 * Contacts the Memberful OAuth service to ensure the user is authenticated.
 * 
 * Returns results of this query asynchronously. Callback will be called with
 * `true` on success, `false` otherwise.
 */
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
