'use strict';

module.exports = {
    canThrowCard: function(handlerContext) {
        /*
        * To determine when can a card should be inserted in the response.
        * In response to a PlaybackController Request (remote control events) we cannot issue a card,
        * Thus adding restriction of request type being "IntentRequest".
        */
        if (handlerContext.event.request.type === 'IntentRequest' && handlerContext.attributes['playbackIndexChanged']) {
            handlerContext.attributes['playbackIndexChanged'] = false;
            return true;
        } else {
            return false;
        }
    },

    getFeed: function(url, callback) {

    }
}