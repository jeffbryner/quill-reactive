Update/fork of the quill-reactive project from https://github.com/jonlachlan/quill-reactive to support simple live editing

This package is currently version 0.0.10, suitable for community testing and feedback. See the todos section below for development plans.

# quill-reactive

Helpers for QuillJS rich text (WYSIWYG) editor, with live editing similar to Google Docs or Etherpad.

You can see a demo of it here: http://quill-realtime-demo.jeffbryner.com:3000/

To add it to your project:

`meteor add jeffbryner:quill-reactive`

To use the `quillReactive` template, provide arguments for collectionName, docId and field.

```
 {{> quillReactive collection="myCollection" docId=docId field="fieldName"}}
```

Note that `collection` should be the MongoDB collection name, not the global variable.
docId is the collection _id field value of the item in the collection
field is the name of the field in the item that you'd like to deposit the resulting HTML

This package will create a 'fieldNameDelta' field that will hold the ongoing quill-delta that represents the contents of the quill editor.

## About

Quill uses deltas for performing operational transform (OT) on changes to rich text rendered as HTML. The full toolbar is supplied in this instance, no authorship or multiple cursors are currently implemented.

### Live Editing

This package combines the features of Quill with the data reactivity of Meteor. The result is a text editor that has the same live editing features as Google Docs and Etherpad.


### Offline Edits/ Late Updates / Drafts

Only live editing is supported in this fork to allow for a simpler update model.


## Todos

* Authorship tracking
* Multiple cursors
* Customizable settings helpers (e.g., toolbar buttons)
* Consider offline modes


## Consistency Model
As noted in https://en.wikipedia.org/wiki/Operational_transformation establishing a consistency model
is important in collaborative editing schemes. This project started with an ordered 'stack' that
preferred offline editing. This fork prefers/requires online, live editing and takes the following approach to
establishing consistency:

### Components/Advantages
Quill operates most efficiently using Deltas which are small incremental changes based on a current state. It
is very easy to generate a delta (per keystroke even), and apply it to an existing editor contents.
Quill Documents are natively stored as a series of actions. These actions can be Delta'd against a current editor contents to product and apply changes to achieve consistency.

Streams via https://github.com/RocketChat/meteor-streamer are highly efficient ways to establish a channel for sending and receiving messages.

### Concept of operations
Deltas are sent per edit operation (keystroke, format change, delete) and applied as they are received. However without corrective measures this has the following bugs:
- Network issues (drops/latency) can result in an editor being out of sync such that resulting deltas do not
accomplish the same change as the originating editor.
- A new editor joining a stream without 'saved' content will get deltas that are out of sync
- Saves must be performed manually to preserve edited contents

To combat these issues, this package does the following:
- On template render, the template joins a stream dedicated to all quill-reactive clients
- The template registers for events emitted on 'collection-docId-fieldName-delta'
- On template render, a reactive subscription to the field is established ala traditional meteor
- On 'text-change', event from quill a delta is sent to the stream (capturing single keystrokes, backspaces, hotkey format changes, etc)
- On input, a _.debounced save is made at 500 millisecond intervals (syncing newcomers, allowing for fast typing/copy pastes, etc)
- On toolbar click a _.debounced save is made at 500 millisecond intervals to capture toolbar format changes since they don't show up in other events.

Note: Originally there was one stream per field, but streams need to be created prior to a client using them or the first client doesn't receive events (for some reason). So a common stream is created server-side for clients to join.

## Misc Ideas
If the event capture/steam isn't sufficient, consider:
- include hash with delta. If hash doesn't match current contents do not apply delta but either
  - pull down last sync'd copy
  - request a save/sync
  - wait for a save
- New client entering stream forces sync/save

