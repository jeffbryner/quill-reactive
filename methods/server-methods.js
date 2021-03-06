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
    }) //end Meteor.methods
};