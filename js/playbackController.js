module.exports = function(eventHandler) {
    return {
        start: function(track) {console.log(`playing ${track.title}`)},
        pause: function() {/*...*/},
        resume: function() {/*...*/},
        restart: function() {/*...*/},
        play: function() {/*...*/},
    };
};

// var controller = function () {
//     return {
//         play: function () {
//             /*
//              *  Using the function to begin playing audio when:
//              *      Play Audio intent invoked.
//              *      Resuming audio when stopped/paused.
//              *      Next/Previous commands issued.
//              */
//             this.handler.state = constants.states.PLAY_MODE;

//             if (this.attributes['playbackFinished']) {
//                 // Reset to top of the playlist when reached end.
//                 this.attributes['index'] = 0;
//                 this.attributes['offsetInMilliseconds'] = 0;
//                 this.attributes['playbackIndexChanged'] = true;
//                 this.attributes['playbackFinished'] = false;
//             }

//             var token = String(this.attributes['playOrder'][this.attributes['index']]);
//             var playBehavior = 'REPLACE_ALL';
//             var podcast = audioData[this.attributes['playOrder'][this.attributes['index']]];
//             var offsetInMilliseconds = this.attributes['offsetInMilliseconds'];
//             // Since play behavior is REPLACE_ALL, enqueuedToken attribute need to be set to null.
//             this.attributes['enqueuedToken'] = null;

//             if (canThrowCard.call(this)) {
//                 var cardTitle = 'Playing ' + podcast.title;
//                 var cardContent = 'Playing ' + podcast.title;
//                 this.response.cardRenderer(cardTitle, cardContent, null);
//             }

//             this.response.speak("Cool, I'll play that funky fresh shit for you.")
//             this.response.audioPlayerPlay(playBehavior, podcast.url, token, null, offsetInMilliseconds);
//             this.emit(':responseReady');
//         },
//         stop: function () {
//             /*
//              *  Issuing AudioPlayer.Stop directive to stop the audio.
//              *  Attributes already stored when AudioPlayer.Stopped request received.
//              */
//             this.response.audioPlayerStop();
//             this.emit(':responseReady');
//         },
//         playNext: function () {
//             /*
//              *  Called when AMAZON.NextIntent or PlaybackController.NextCommandIssued is invoked.
//              *  Index is computed using token stored when AudioPlayer.PlaybackStopped command is received.
//              *  If reached at the end of the playlist, choose behavior based on "loop" flag.
//              */
//             var index = this.attributes['index'];
//             index += 1;
//             // Check for last audio file.
//             if (index === audioData.length) {
//                 if (this.attributes['loop']) {
//                     index = 0;
//                 } else {
//                     // Reached at the end. Thus reset state to start mode and stop playing.
//                     this.handler.state = constants.states.START_MODE;

//                     var message = 'You have reached at the end of the playlist.';
//                     this.response.speak(message).audioPlayerStop();
//                     return this.emit(':responseReady');
//                 }
//             }
//             // Set values to attributes.
//             this.attributes['index'] = index;
//             this.attributes['offsetInMilliseconds'] = 0;
//             this.attributes['playbackIndexChanged'] = true;

//             controller.play.call(this);
//         },
//         playPrevious: function () {
//             /*
//              *  Called when AMAZON.PreviousIntent or PlaybackController.PreviousCommandIssued is invoked.
//              *  Index is computed using token stored when AudioPlayer.PlaybackStopped command is received.
//              *  If reached at the end of the playlist, choose behavior based on "loop" flag.
//              */
//             var index = this.attributes['index'];
//             index -= 1;
//             // Check for last audio file.
//             if (index === -1) {
//                 if (this.attributes['loop']) {
//                     index = audioData.length - 1;
//                 } else {
//                     // Reached at the end. Thus reset state to start mode and stop playing.
//                     this.handler.state = constants.states.START_MODE;

//                     var message = 'You have reached at the start of the playlist.';
//                     this.response.speak(message).audioPlayerStop();
//                     return this.emit(':responseReady');
//                 }
//             }
//             // Set values to attributes.
//             this.attributes['index'] = index;
//             this.attributes['offsetInMilliseconds'] = 0;
//             this.attributes['playbackIndexChanged'] = true;

//             controller.play.call(this);
//         },
//         loopOn: function () {
//             // Turn on loop play.
//             this.attributes['loop'] = true;
//             var message = 'Loop turned on.';
//             this.response.speak(message);
//             this.emit(':responseReady');
//         },
//         loopOff: function () {
//             // Turn off looping
//             this.attributes['loop'] = false;
//             var message = 'Loop turned off.';
//             this.response.speak(message);
//             this.emit(':responseReady');
//         },
//         shuffleOn: function () {
//             // Turn on shuffle play.
//             this.attributes['shuffle'] = true;
//             shuffleOrder((newOrder) => {
//                 // Play order have been shuffled. Re-initializing indices and playing first song in shuffled order.
//                 this.attributes['playOrder'] = newOrder;
//                 this.attributes['index'] = 0;
//                 this.attributes['offsetInMilliseconds'] = 0;
//                 this.attributes['playbackIndexChanged'] = true;
//                 controller.play.call(this);
//             });
//         },
//         shuffleOff: function () {
//             // Turn off shuffle play. 
//             if (this.attributes['shuffle']) {
//                 this.attributes['shuffle'] = false;
//                 // Although changing index, no change in audio file being played as the change is to account for reordering playOrder
//                 this.attributes['index'] = this.attributes['playOrder'][this.attributes['index']];
//                 this.attributes['playOrder'] = Array.apply(null, {length: audioData.length}).map(Number.call, Number);
//             }
//             controller.play.call(this);
//         },
//         startOver: function () {
//             // Start over the current audio file.
//             this.attributes['offsetInMilliseconds'] = 0;
//             controller.play.call(this);
//         },
//         reset: function () {
//             // Reset to top of the playlist.
//             this.attributes['index'] = 0;
//             this.attributes['offsetInMilliseconds'] = 0;
//             this.attributes['playbackIndexChanged'] = true;
//             controller.play.call(this);
//         }
//     }
// }();
