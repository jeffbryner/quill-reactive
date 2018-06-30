Update/fork of the quill-reactive project from https://github.com/jonlachlan/quill-reactive to support simple live editing

This package is currently version 0.0.10, suitable for community testing and feedback. See the todos section below for development plans.

# quill-reactive

Helpers for QuillJS rich text (WYSIWYG) editor, with live editing similar to Google Docs or Etherpad.

See this example: http://quill-reactive-ot.meteor.com

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

