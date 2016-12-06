'use strict';

module.exports = (function() {
    return {
        isSessionAuthenticated: function(session, callback) {
            setTimeout(function(){
                callback(this._stubResponse)
            }, 100);
        },
        
        // TODO: remove after stub is filled out
        _stubResponse: true,
    };
})();
