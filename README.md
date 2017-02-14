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
5. If the show is serialized, edit the 'isSerialShow' in _gimlet.js_ to add a new showID

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

### Generating utterances

Utterances corresponding to each intent are uploaded to Alexa via the "Sample Utterances" text field in the Interaction Model tab of the Alexa developer portal. All of the utterances are kept in the project files at `speechAssets/Utterances.txt`, and are simply copy-and-pasted to the Alexa portal when any changes are made. This way, we can keep track of any changes in source control.

There are a lot of slightly different ways a user might speak an intent (check out [this Alexa tutorial](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/defining-the-voice-interface) for details). To help us create the complete list, we use an [Alexa Utterance Generator](http://alexa-utter-gen.paperplane.io/). It makes it easy to generate all the different permutations using a simple regex-like syntax. For example, setting the intent to WhoIsMatt and entering "(who|what) is matt (lieber|leeber)" would generate the following four utterances:

- WhoIsMatt who is matt lieber
- WhoIsMatt who is matt leeber
- WhoIsMatt what is matt lieber
- WhoIsMatt what is matt leeber

You can find the syntax we used to generate the existing utterances as comments in `Utterances.txt` (search for "#"). Copying that line (without the "#") into the Alexa Utterance Generator will create the list of utterances immediately below that comment. 

>
IMPORTANT: When you're copy-and-pasting into the Alexa console, leave out the commented lines. Otherwise your interaction model won't build (though there will be a warning message, so it should be pretty obvious if you forgot to delete those lines). It's a good idea to keep the comments in source control, though, in case you want to make any tweaks and regenerate the utterances later on.

You should have utterances for each of the following intents, and the intent name must be the first thing in each line:

- PlayLatest
- PlayExclusive
- PlayFavorite
- ListShows
- WhoIsMatt
- Nevermind
- NeedAssistance
- ShowTitleIntent
- NumberIntent

(You shouldn't ever need to add anything to ShowTitleIntent).

You'll notice that there are a lot more utterances for PlayLatest than any of the other intents, and that's intentional. It's pretty opaque how Alexa's natural language processing works, but we're trying to influence which intent Alexa prefers when it's not sure of the right answer. In this case, we think PlayLatest is the most common action, so we're more thorough when generating its utterances than those for PlayExclusive or PlayFavorite, for example.

Final note: I think you're allowed a maximum of 10,000 sample utterances, but I can't find any source for that. If you decide to expand your utterances and are running into issues, keep in mind that there may be an upper limit.
