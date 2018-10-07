// shared streamer
// Client side is created during the template initiation according to meteor load order
// and the first client in would miss events.
// So we create the server side here:

if (Meteor.isServer) {
    const streamer = new Meteor.Streamer('quill-reactive-streamer');
    streamer.allowRead('all');  // Everyone can read all events
    streamer.allowEmit('all');  // Everyone can emit all events
    streamer.allowWrite('all'); // Everyone can write
    streamer.retransmit = true;
    streamer.retransmitToSelf = false;
}