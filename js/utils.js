const gimlet = require('./gimlet');

module.exports = {
    getShowFromSlotValue: getShowFromSlotValue,
    getNumberFromSlotValue: getNumberFromSlotValue,
    urlToSSML: urlToSSML,
    speakAndSendError: speakAndSendError
};

function getShowFromSlotValue(request) {
    const slots = request.intent.slots;
    if (slots) {
        const slot = slots["ShowTitle"];
        if (slot && slot.value) {
            return gimlet.showMatchingSlotValue(slot.value);
        }
    }
}

function getNumberFromSlotValue(request) {
    const slot = request.intent.slots["Number"];
    if (slot && slot.value !== undefined) {
        return Number(slot.value);
    }
}

function urlToSSML(url) {
    return `<audio src="${url}" />`;
}

function speakAndSendError(response) {
    return function(err) {
        response.speak(speaker.get("Error")).send();
    };
}

