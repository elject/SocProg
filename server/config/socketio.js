/**
 * Socket.io configuration
 */

'use strict';

var config = require('./environment');
var User = require('../api/user/user.model');
var collection = {};

//require('../api/thing/thing.socket').send(collection);

// When the user disconnects.. perform this
function onDisconnect(socket) {
}

require('../api/thing/thing.socket').register(collection);

// When the user connects.. perform this
function onConnect(socket) {
  // When the client emits 'info', this listens and executes
  socket.on('info', function (data) {
    console.info('[%s] %s', socket.address, JSON.stringify(data, null, 2));
  });

  // Insert sockets below
  require('../api/message/message.socket').register(socket, collection);
  require('../api/repo/repo.socket').register(socket);
  require('../api/comment/comment.socket').register(socket);
}

module.exports = function (socketio) {
  // socket.io (v1.x.x) is powered by debug.
  // In order to see all the debug output, set DEBUG (in server/config/local.env.js) to including the desired scope.
  //
  // ex: DEBUG: "http*,socket.io:socket"

  // We can authenticate socket.io users and access their token through socket.handshake.decoded_token
  //
  // 1. You will need to send the token in `client/components/socket/socket.service.js`
  //
  // 2. Require authentication here:
  socketio.use(require('socketio-jwt').authorize({
     secret: config.secrets.session,
     handshake: true
   }));

  socketio.on('connection', function (socket) {

    User.findById(socket.decoded_token._id, function (err, user) {
      if (err) return next(err);
      if (!user) return console.log('user not found');
      collection[user._id] = socket;
      socket.user = user;
      //console.log(socketio.to);
      //socket.address = socket.address !== null ?
        //socket.handshake.address.address + ':' + socket.handshake.address.port :
        //process.env.DOMAIN;
      socket.connectedAt = new Date();

      // Call onDisconnect.
      socket.on('disconnect', function () {
        delete collection[socket.user._id];
        onDisconnect(socket);
        console.info('[%s] DISCONNECTED', socket.user.name);
      });

      // Call onConnect.
      onConnect(socket);
        console.info('[%s] CONNECTED', socket.user.name);
      });
    });


};