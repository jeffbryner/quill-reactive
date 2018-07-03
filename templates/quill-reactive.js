//define using require instead of import
//since we are using an npm dependency in the same file
const Quill = require('quill');
const Delta = require('quill-delta');
require('meteor/rocketchat:streamer');
const streamer = new Meteor.Streamer('quill');


//log only in debug mode
debugLog=function(logthis){
    if (typeof console !== 'undefined') {
        console.log(logthis);
    }
};

applyDelta = function(delta){
    var editorContents = new Delta(tmpl.quillEditor.getContents());
    var remoteChanges = delta;
    if(remoteChanges.ops.length > 0) {
        // Make updates, to allow cursor to stay put
        tmpl.quillEditor.updateContents(remoteChanges,'silent');
    }
}

textChangesListener = function(delta, oldDelta, source) {
    console.log('text change listener called',delta, oldDelta, source);
    if (source === 'user') {
        //var opts = tmpl.data;
        //var collection = Mongo.Collection.get(opts.collection);
        //var doc = collection.findOne({_id: opts.docId});
        // Check for other new content besides the last keystroke
        //var editorContents = tmpl.quillEditor.getContents();
        //var editorHTML = tmpl.quillEditor.root.innerHTML;
        //debugLog('textChangesListener', editorContents);
        //debugLog('calling update Quill', opts.collection, opts.docId, opts.field, editorContents, editorHTML);
        //Meteor.call("updateQuill", opts.collection, opts.docId, opts.field, editorContents, editorHTML);

        if (tmpl.streamer){
            tmpl.streamer.emit('delta',delta);
            console.log('emitted', delta)
        }
    }
};

Template.quillReactive.onCreated(function() {
    var tmpl = this;
    tmpl.quillEditor = {};
    tmpl.streamer = streamer;

});

Template.quillReactive.onRendered(function() {
    tmpl = this;
    // var authorId = Meteor.user().username;
    // TODO: add authorship
    // TODO: add cursors
    tmpl.quillEditor = new Quill('#editor-' + tmpl.data.docId, {
        modules: {
        'toolbar': '#toolbar'
        },
        theme: 'snow'
    });

    tmpl.streamer.on('delta',function(delta){ console.log(delta);});
    tmpl.streamer.on('delta',applyDelta);
    //debug
    window.qe = tmpl;

    // Fix link tooltip from getting stuck
    tmpl.$('.ql-container').mousedown(function(e) {
        if(!($(e.target).is('a'))) {
        $('.ql-tooltip.ql-link-tooltip:not(.editing)').css('left', '-10000px');
        }
    });
    //var authorship = tmpl.quillEditor.getModule('authorship');
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
        if(Session.get("liveEditing") && Meteor.status().connected) {
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

Template.quillReactive.helpers({
  liveEditing: function() {
    return Session.get("liveEditing");
  },
  connection: function() {
    status = Meteor.status().status;
    return {
      connected: function() { return (status === "connected")},
      connecting: function() { return (status === "connecting")},
      offline: function() { return (status === "offline" || status === "waiting")}
    }
  },
  hasEdits: function() {
    // var tmpl = Template.instance();
    // var unsavedChanges = QuillDrafts.get(tmpl.data.collection + "-" + tmpl.data.docId + "-" + tmpl.data.field);
    // if(tmpl.quillEditor && unsavedChanges) {
    //   var hasEdits = (unsavedChanges && unsavedChanges.draft && unsavedChanges.draft.ops.length > 0)
    //   return (hasEdits)
    // }
    return true;
  }
});


Template.quillReactive.events({
  'click .ql-save': function(e, tmpl) {
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
  },
  'click .toggle-live-editing': function(e, tmpl) {
    Session.set("liveEditing", !Session.get("liveEditing"));
  },
  'click .ql-reconnect': function(e, tmpl) {
    Meteor.reconnect();
  }
});
