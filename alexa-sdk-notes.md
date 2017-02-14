GREG's Notes to himself

Need to do most of development with an Alexa stub object.
BSTAlexa looks promising. But does it handle persistance?
We could rig our own replacement up -- subclass from Alexa and override saveState, responseReady, spy for response object, etc.

Point is that specs need to be in terms of expectations. Design by contract. Should be easy enough
to do given how explicit state is managed with Alexa -- we'll see.

Cover all permutations of domain with handlers: State x (Intents + Events + PlayerRequests). Good place
for a truth table-like sketch where each cell explains actions needed. 


# Alexa Response Handler Context ("this")

## this.attributes

The session-level custom key-value store. 
    
SDK abstracts the getting/setting of them. they're actually "gotten" from the 
session object, and "set" includes a "sessionAttributes" object in the HTTP 
response

SDK also abstracts away persistance. if configured, will mirror the attributes 
on a DynamoDB store. (before request is handled, attributes are initialized 
from the store; before response is sent, attributes are saved back to store) 

## this.handler

The Request Handler that `execute` is called on in index.js

### this.handler.state

Special session attribute that is promoted to handler level.
Set/get this directly, not the version living in attributes

## this.response function calls

Abstracts away details of constructing response JSON.

Some examples:

- `speak()` adds an `"outputSpeech"` property to the response
- `listen()` adds a `"reprompt"` property and sets `shouldEndSession` to `false`
- `audioPlayer()` adds relevant `directive` objects

Full details can be found in ResponseBuilder in alexa.js (line 255) 

## this.emit

Calls emit on this.handler.

Note that the handler responding to this event will have the same "this" context (see step 2 discussion below for details)

### this.context.succeed

"Callback" function to tells lambda environment to end execution

# Lambda-based execution flow:

1. Lambda calls the `handler` defined in index.js. This handler follows a standard 
    signature: (event, context, callback)

2. index.js creates an "Alexa Request Handler" object, which is created via a factory 
    that itself conforms to the Lambda handler signature
    - This handler object's properties are defined at line 27 of alexa.js
    - This handler is sort of a "Master Handler" and acts as the dispatch point for 
        all emitted events. Emitted events can be anything from response definitions 
        (e.g. ":tell", ":responseReady", defined in alexa-sdk/response.js) to Alexa-
        invoked Intents or Requests (see alexa.js:168 for details on event names)
    - The handler functions of the events the Request Handler emits are given a 
        "this" context as defined at alexa.js:225. This context provides pretty much
        everything a handler function might need, hence the ubiquitous "this.whatever" 
        calls littered through alexa-sdk client code. 

3. The handler is set up with all kinds of additional "response handlers". These are 
    the meat of the application: functions that do the work of your skill.
    - When defined, these response handlers are tagged with event names that correspond
        to the Intent/Request/AudioEvent that triggers them. This is how The Alexa
        Request Handler knows how to route the initial event in step 5 below.

4. handler.execute() is called, which eventually calls ValidateRequest (alexa.js:120)
    on the handler, which is responsible for doing some validation and initializing 
    DynamoDB-saved attributes

5. After validation/initialization, the EmitEvent (alexa.js:168) function is called, 
    which looks into the original Lambda `event` details to figure out which response
    handler will take over.

6. The response handler takes over, which is responsible for completing the operation,
    which is done by calling `succeed`/`fail`/`done` on this.context.
    - Typically, `succeed` is called with an Alexa Response JSON object
    - Note that ending execution with this.context is a deprecated practice, but 
        alexa-sdk still uses it, presumably to support Node 0.10 
        (see http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-using-old-runtime.html#transition-to-new-nodejs-runtime)
    - Most of the time, emitting a ":responseReady" or ":saveState" will handle the 
        this.context calls. The only time you might want to do it directly is when
        the event you're handling is a true no-op (e.g. as sometime happens with 
        Audio Player Requests, which don't look like typical Alexa responses)
