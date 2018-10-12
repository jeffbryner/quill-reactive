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
    console.log('applying delta',delta);
    var editorContents = new Delta(tmpl.quillEditor.getContents());
    var remoteChanges = delta;
    if(remoteChanges.ops.length > 0) {
        // Make updates, to allow cursor to stay put
        tmpl.quillEditor.updateContents(remoteChanges,'silent');
    }
}

applyCursor = function (cursorEvent){
    console.log('applying cursor:',cursorEvent);
    tmpl.cursors.setCursor(cursorEvent.userid,
        cursorEvent.range,
        cursorEvent.name,
        cursorEvent.color);
    tmpl.cursors.update();
}

deleteCursorListener = function(deleteEvent){
    tmpl.cursors.removeCursor(deleteEvent.userid);
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

textSelectionListener = function(range, oldRange, source) {
    //console.log('text selection listener called',range, oldRange, source);
    if (source === 'user') {
        if (tmpl.streamer && range){

            // If we've got a meteor.user, use it
            if ( Meteor.user() ){
                tmpl.cursors.userid = Meteor.user()._id || new Mongo.ObjectID()._str;
                tmpl.cursors.userName = Meteor.user().username || Meteor.user().emails[0].address || 'unknown';
            }

            cursorEvent={
                userid:tmpl.cursors.userid,
                range: range,
                name: tmpl.cursors.userName,
                color: tmpl.cursors.color}
            tmpl.streamer.emit(tmpl.streamCursorEventName,cursorEvent);
            console.log('emitted', cursorEvent);
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
    tmpl.streamDeltaEventName = tmpl.data.collection + '-' + tmpl.data.docId + '-' + tmpl.data.field + '-delta';
    tmpl.streamCursorEventName = tmpl.data.collection + '-' + tmpl.data.docId + '-' + tmpl.data.field + '-cursor';
    tmpl.streamCursorDeleteName = tmpl.data.collection + '-' + tmpl.data.docId + '-' + tmpl.data.field + '-cursor-delete';
    // new grabs a handle to the exisiting one created by the server
    tmpl.streamer = new Meteor.Streamer('quill-reactive-streamer');
});

Template.quillReactive.onRendered(function() {
    tmpl = this;
    // var authorId = Meteor.user().username;
    var toolbarOptions = [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ 'font': [] }],
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent

        [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
        ['blockquote', 'code-block'],
        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'align': [] }],
        [{ 'direction': 'rtl' }]
      ];
    Quill.register('modules/cursors', QuillCursors);
    Quill.import('modules/cursors')
    tmpl.quillEditor = new Quill('#quill-editor-' + tmpl.data.docId, {
        modules: {
        'toolbar': toolbarOptions,
        cursors: {  autoRegisterListener: false,
                    hideDelay:1000}
        },
        scrollingContainer: "#quill-container-" + tmpl.data.docId,
        theme: 'snow'
    });
    tmpl.cursors = tmpl.quillEditor.getModule('cursors');
    // set defaults which will be overridden
    // with Meteor.User values once the listener kicks in
    tmpl.cursors.userid = new Mongo.ObjectID()._str;
    tmpl.cursors.userName='unknown';
    tmpl.cursors.color = '#' + Math.floor(Math.random()*16777215).toString(16);

    // setup the streaming listeners
    tmpl.streamer.on(tmpl.streamDeltaEventName,applyDelta);
    tmpl.streamer.on(tmpl.streamCursorEventName, applyCursor);
    tmpl.streamer.on(tmpl.streamCursorDeleteName, deleteCursorListener);
    //debug
    //window.qe = tmpl;

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
                tmpl.quillEditor.on('selection-change', textSelectionListener);
            }
            debugLog('done setting up text changes listener');
        } else {
            debugLog('removing text changes listener');
            if (tmpl.quillEditor){
                tmpl.quillEditor.off("text-change", textChangesListener);
                tmpl.quillEditor.off('selection-change', textSelectionListener);
                console.log('removing cursor for userid: ' + tmpl.cursors.userid);
                tmpl.streamer.emit(tmpl.streamCursorDeleteName,{userid:tmpl.cursors.userid});
                tmpl.cursors.removeCursor(tmpl.cursors.userid);
            }
        }
    });
});

Template.quillReactive.destroyed = function () {
    // remove any cursor we've registered
    console.log('removing cursor for userid: ' + this.cursors.userid);
    this.streamer.emit(this.streamCursorDeleteName,{userid:this.cursors.userid});
};

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
