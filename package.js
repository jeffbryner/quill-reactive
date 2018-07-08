Package.describe({
  name: 'jeffbryner:quill-reactive',
  version: '0.0.10',
  summary: 'Helpers for QuillJS rich text (WYSIWYG) editor, with live editing similar to Google Docs or Etherpad',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/jeffbryner/quill-reactive',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
    quill: '1.3.6'
  });

Package.onUse(function(api) {
  api.versionsFrom('METEOR@1.0');
  api.use("templating", "client");
  api.use('mongo', 'server');
  api.use('underscore','client');
  api.use('modules@0.12.0');
  api.use('dburles:mongo-collection-instances@0.3.4');
  api.use('rocketchat:streamer@0.6.2');
  api.addFiles('templates/quill-reactive.html', 'client');
  api.addFiles('templates/quill-reactive.js', 'client');
  api.addFiles('methods/server-methods.js', 'server');
  api.addFiles('main.js');
});
