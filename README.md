# Gimlet Skill Notes

## States & Intents

At a high level, the code is organized into various "action" functions, described and implemented in _mainActions.js_, _dialogueActions.js_, and _playbackEventActions.js_. The particular action function chosen for a particular interaction depends on a users **Intent** as well as the skill's current **State**.

Not every intent is relevant in every state. Below, the states and intents available in each of these states are detailed. These relationships are defined in _routers.js_.:

### State: `DEFAULT`

The skill is idle, playing audio, or not expecting any particular response from the user

Supported intents:

- LaunchRequest (when "Open Gimlet" is said)
    - If audio is currently paused, skill will ask if user wants to resume and enter `QUESTION_CONFIRM` state.
- PlayLatest
    - If user doesn't mention a show, skill will ask for one and enter `ASK_FOR_SHOW` state.
- PlayFavorite
    - If user doesn't mention a show, skill will ask for one and enter `ASK_FOR_SHOW` state.
- PlayExclusive
    - Skill will present the user with exclusive content options and enter `QUESTION_EXCLUSIVE_NUMBER` state.
- WhoIsMatt
- ListShows
- ShowTitleIntent
    - If user just names a show, it will be treated as a **PlayLatest** intent for that show.
- Nevermind
- NeedAssistance
- AMAZON.HelpIntent
- AMAZON.PauseIntent
- AMAZON.ResumeIntent
- AMAZON.StopIntent
- AMAZON.CancelIntent
- AMAZON.StartOverIntent

### State: `ASK_FOR_SHOW`

Alexa is asking the user to name a specific show

- **ShowTitleIntent** (Question response)
    - If a show is mention
- ListShows
- Nevermind
- NeedAssistance
- AMAZON.HelpIntent
- AMAZON.StopIntent
- AMAZON.CancelIntent

### State: `QUESTION_CONFIRM`

Alexa is asking the user a yes or no question

- **AMAZON.YesIntent** (Question response)
- **AMAZON.NoIntent** (Question response)
- Nevermind
- NeedAssistance
- AMAZON.HelpIntent
- AMAZON.StopIntent
- AMAZON.CancelIntent

### State: `QUESTION_EXCLUSIVE_NUMBER`
Alexa is asking the user to select a numbered exclusive

- **NumberIntent** (Question response)
- Nevermind
- NeedAssistance
- AMAZON.HelpIntent
- AMAZON.StopIntent
- AMAZON.CancelIntent

## Common maintenance tasks

### Adding a new show

When adding (or removing) a show from the list that the skill supports, the following changes are necessary:

1. Edit the `LIST_OF_SHOW_TITLES` custom slot type in the Alexa console.
2. Updates in _gimlet.js_
    - Update the `showIds` array in _gimlet.js_
    - Add any alternative ways of saying a show (e.g. _"heavy weights"_ for Heavyweight) in the `showMatchingSlotValue()` function in _gimlet.js_.
    - If the show is serailized, edit the `isSerialShow()` function. This will support sequential playback for the show.
3. Update "middleman" JSON files with new configuration info:
    - https://s3.amazonaws.com/amazon-alexa/sources/favorites.json
    - https://s3.amazonaws.com/amazon-alexa/sources/feeds.json
4. Update the `urlSuffixMap` in _speaker.js_. These values are used by the speaker module to fetch show-specific host audio. For example, the "Here's the most recent episode of Reply All" audio lives at https://s3.amazonaws.com/.../Most+Recent+Reply+All.mp3, so the suffix there is **Reply+All**.
5. If the show is serailized, edit the 

### Updating favorites/exclusives/"Matt Lieber Is"

The audio content for these live in "middleman" JSON files hosted on S3:

- https://s3.amazonaws.com/amazon-alexa/sources/favorites.json
- https://s3.amazonaws.com/amazon-alexa/sources/exclusives.json
- https://s3.amazonaws.com/amazon-alexa/sources/mattlieberis.json


#### A note on favorites

We track which favorite episode of a show a user last heard by it's index in the list of episodes in _favorites.json_. The next time we play a favorite from the same show, we'll increase that index by 1.

If this index is ever greater than the number of favorites available for that show, we cycle back by forcing the index down to modulo that number.

This means you don't have to worry about messing with the number of favorites available for a given show. The user will always hear a valid episode.

### Changing host speech

All things spoken by the skill run through the _speaker.js_ file, so all changes to speech content can be achieved by there. 

Note that you can only change the content of speech already being said in the flow of the skill. Adding or removing speech prompts is only possible through code changes.
