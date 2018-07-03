// shared streamer
// Client side is created during the template initiation according to meteor load order
// So we create the server side here:
if (Meteor.isServer) {
    const streamer = new Meteor.Streamer('quill');
    streamer.allowRead('all'); // Everyone can read all events
    streamer.allowEmit('all'); // Everyone can emit all events
    streamer.allowWrite('all'); //Everyone can write
}