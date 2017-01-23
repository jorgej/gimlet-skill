/**
 * utils.js
 * Author: Greg Nicholas
 * 
 * Contains configuration for all content spoken by Alexa.
 */

"use strict";

const gimlet = require('./gimlet');

module.exports = {
    getShowFromSlotValue: getShowFromSlotValue,
    getNumberFromSlotValue: getNumberFromSlotValue,
    urlToSSML: urlToSSML,
    speakAndSendError: speakAndSendError
};

/**
 * Reaches into the request to find a "ShowTitle" slot. If found,
 * returns the corresponding Gimlet show ID refered to.
 */
function getShowFromSlotValue(request) {
    const slots = request.intent.slots;
    if (slots) {
        const slot = slots["ShowTitle"];
        if (slot && slot.value) {
            return gimlet.showMatchingSlotValue(slot.value);
        }
    }
}

/**
 * Reaches into the request to find a "Number" slot. If found,
 * returns number's value.
 */

function getNumberFromSlotValue(request) {
    const slot = request.intent.slots["Number"];
    if (slot && slot.value !== undefined) {
        return Number(slot.value);
    }
}

/**
 * Audio URL in an SSML wrapper.
 * 
 * Note, any URL must refer to an audio file that conforms to Amazon's 
 * requirements for Alexa-spoken audio. 
 * 
 * See https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#audio
 */
function urlToSSML(url) {
    return `<audio src="${url}" />`;
}

/**
 * Speaks the generic error message specified in speaker.js and ends 
 * the response immediately. This is often used in exception handling.
 */
function speakAndSendError(response) {
    return function(err) {
        response.speak(speaker.get("Error")).send();
    };
}
