'use strict';

module.exports = (function() {
    return {
        isSessionAuthenticated: function(session, callback) {
            // TODO: replace with real impl below once we have tokens
            setTimeout((function(){
                callback(true)
            }).bind(this), 100);

            // if (session.user.accessToken) {
            //     const https = require('https');
            //     const accountURL = `https://gimletmedia.memberful.com/account.json?access_token=${session.user.accessToken}`;

            //     https.get(accountURL, function(response) {
            //         const didSucceed = (response.statusCode === 200);
            //         callback(didSucceed);
            //     });
            // }
            // else {
            //     callback(false);
            // }
        }
    };
})();
