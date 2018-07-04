if (Meteor.isServer) {
    Meteor.methods({
        'updateQuill': function(collectionName, docId, field, editorContents, editorHTML) {
            //console.log('updateQuill server side called with contents: ',editorContents );
            var collection = Mongo.Collection.get(collectionName);
            var collectionUpdate = { $set: {} };
            collectionUpdate["$set"][field + "Delta"] = editorContents;
            collectionUpdate["$set"][field] = editorHTML;
            collection.update({_id: docId}, collectionUpdate)
            //console.log('collection update', collectionUpdate);
        }, //end updateQuill
        'createStreamer': function(streamerName){
            // called by the template to create a streamer formatted
            // collection-docId-field
            // so we have a synchronized server/client stream dedicated to each field
            // being live edited
            const streamer = new Meteor.Streamer(streamerName); // create or get a handle to the stream
            streamer.allowRead('all');  // Everyone can read all events
            streamer.allowEmit('all');  // Everyone can emit all events
            streamer.allowWrite('all'); // Everyone can write
            // since the client creates the stream it gets
            // to set retransmit.. lets ensure it's what we want.
            streamer.retransmit = true;
            streamer.retransmitToSelf = false;
            //streamer.on('delta', function(message) {
            //    console.log(new Date(), message);
            //  });
        } //end createStreamer
    }) //end Meteor.methods
};