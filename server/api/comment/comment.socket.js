/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Comment = require('./comment.model');

exports.register = function(socket) {
  Comment.schema.post('save', function (doc) {
    doc.populate('user', 'picture name', function(err, comment){
      onSave(socket, comment);
    });
  });
  Comment.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('comment'+doc.parent+':save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('comment'+doc.parent+':remove', doc);
}