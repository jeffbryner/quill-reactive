//define using require instead of import
//since we are using an npm dependency in the same file
const Quill = require('quill');
require('quill/dist/quill.snow.css');
const Delta = require('quill-delta');
const QuillCursors=require('quill-cursors/dist/quill-cursors.min.js');
require('quill-cursors/dist/quill-cursors.css');
require('meteor/rocketchat:streamer');

//log only in debug mode
debugLog=function(logthis){
    if (typeof console !== 'undefined') {
        console.log(logthis);
    }
};

applyDelta = function(delta){
    console.log('applying',delta);
    var editorContents = new Delta(tmpl.quillEditor.getContents());
    var remoteChanges = delta;
    if(remoteChanges.ops.length > 0) {
        // Make updates, to allow cursor to stay put
        tmpl.quillEditor.updateContents(remoteChanges,'silent');
    }
}

textChangesListener = function(delta, oldDelta, source) {
    //console.log('text change listener called',delta, oldDelta, source);
    if (source === 'user') {
        if (tmpl.streamer){
            tmpl.streamer.emit(tmpl.streamDeltaEventName,delta);
            //console.log('emitted', delta)
        }
    }
};

saveQuillContents = function(tmpl){
    debugLog('save was clicked');
    if(!tmpl.data.field) {
        debugLog('no data field, exiting save');
      return;
    }
    var collection = Mongo.Collection.get(tmpl.data.collection);
    var fieldDelta = tmpl.data.field + "Delta";
    var newContents = tmpl.quillEditor.getContents();
    var newHTML = tmpl.quillEditor.root.innerHTML;
    updateObj = { $set: {}};
    updateObj.$set[fieldDelta] = newContents;
    updateObj.$set[tmpl.data.field] = newHTML;
    // This update assumes that we already have the latest contents in our editor
    collection.update({_id: tmpl.data.docId}, updateObj)
}

Template.quillReactive.onCreated(function() {
    var tmpl = this;
    tmpl.quillEditor = {};
    // connect to the streamer for changes
    // we watch for events on our field
    tmpl.streamDeltaEventName = tmpl.data.collection + '-' + tmpl.data.docId + '-' + tmpl.data.field + '-delta'
    // new grabs a handle to the exisiting one created by the server
    tmpl.streamer = new Meteor.Streamer('quill-reactive-streamer');
});

Template.quillReactive.onRendered(function() {
    tmpl = this;
    // var authorId = Meteor.user().username;
    // TODO: add authorship
    // TODO: add cursors

    Quill.register('modules/cursors', QuillCursors);
    Quill.import('modules/cursors')
    tmpl.quillEditor = new Quill('#editor-' + tmpl.data.docId, {
        modules: {
        'toolbar': '#toolbar',
        cursors: true
        },
        theme: 'snow'
    });


    tmpl.streamer.on(tmpl.streamDeltaEventName,applyDelta);
    //debug
    window.qe = tmpl;

    // Fix link tooltip from getting stuck
    tmpl.$('.ql-container').mousedown(function(e) {
        if(!($(e.target).is('a'))) {
        $('.ql-tooltip.ql-link-tooltip:not(.editing)').css('left', '-10000px');
        }
    });
    //Delta is really the quill contents, but contents are expressed as a Delta object
    var fieldDelta = tmpl.data.field + "Delta";
    var collection = Mongo.Collection.get(tmpl.data.collection);

    var blankObj = {}
    blankObj[tmpl.data.field] = "";
    blankObj[tmpl.data.fieldDelta] = new Delta();


    Tracker.autorun(function() {
        //autorun to sync quill editor contents to the mongo Delta/content
        var doc = collection.findOne({_id:tmpl.data.docId});

        if(!doc) {
            debugLog("no doc found");
            return;
        }

        if(!doc[tmpl.data.field]) {
            collection.update({_id: tmpl.data.docId}, {$set: blankObj});
        }

        //get the contents as they sit in mongo
        var remoteContents = new Delta(doc[fieldDelta]);
        if(!remoteContents) {
            remoteContents = new Delta();
        }
        var editorContents = new Delta(tmpl.quillEditor.getContents());
        var remoteChanges = editorContents.diff(remoteContents);
        debugLog('remoteChanges diff',remoteChanges);

        //var localChanges = oldContents.diff(editorContents);
        if(remoteChanges.ops.length > 0) {
            // Make updates, to allow cursor to stay put
            //tmpl.quillEditor.updateContents(localChanges.transform(remoteChanges, true));
            tmpl.quillEditor.updateContents(remoteChanges,'silent');
        }
    });

    Tracker.autorun(function() {
        if(Meteor.status().connected) {
            debugLog('setting up text changes listener');
            if (tmpl.quillEditor){
                tmpl.quillEditor.on('text-change', textChangesListener);
            }
            debugLog('done setting up text changes listener');
        } else {
            debugLog('removing text changes listener');
            if (tmpl.quillEditor){
                tmpl.quillEditor.off("text-change", textChangesListener);
            }
        }
    });
});

Template.quillReactive.events({
  'click .ql-save': function(e, tmpl) {
    saveQuillContents(tmpl);
  },
  'click .ql-reconnect': function(e, tmpl) {
    Meteor.reconnect();
  },
  // input isn't enough since toolbar changes don't trigger
  'input .ql-editor': _.debounce(function(e,tmpl){
      console.log('editor debounce input');
      saveQuillContents(tmpl);
  } , 500),
  // toolbar format changes aren't capture by the input event
  'click .ql-toolbar': _.debounce(function(e,tmpl){
    console.log('editor debounce format change');
    saveQuillContents(tmpl);
} , 500),
});
