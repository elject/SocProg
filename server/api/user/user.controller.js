'use strict';

var User = require('./user.model');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var config = require('../../config/environment');
var jwt = require('jsonwebtoken');
var Repo = require('../repo/repo.model');

var util = require('util'),
  fs   = require('fs-extra'),
  formidable = require('formidable'),
  gm = require('gm');

var validationError = function(res, err) {
  return res.json(422, err);
};

/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = function(req, res) {
  User.find({}, '-salt -hashedPassword', function (err, users) {
    if(err) return res.send(500, err);
    res.json(200, users);
  });
};

/**
 * Creates a new user
 */
exports.create = function (req, res, next) {
  var newUser = new User(req.body);
  newUser.provider = 'local';
  newUser.role = 'user';
  newUser.save(function(err, user) {
    if (err) return validationError(res, err);
    var token = jwt.sign({_id: user._id }, config.secrets.session, { expiresInMinutes: 60*5 });
    res.json({ token: token });
  });
};

/**
 * Get a single user
 */
exports.show = function (req, res, next) {
  var userId = req.params.id;

  User.findById(userId, function (err, user) {
    if (err) return next(err);
    if (!user) return res.send(401);
    res.json(user.profile);
  });
};


exports.followers = function (req, res) {
  User.count({follows: {$in: [req.params.id]}}, function (err, count){
    if (err) return handleError(err);
    return res.json(200, {count:count});
  });
};


exports.following = function (req, res) {
  User.count({$and:[{_id : req.user._id},{follows: {$in: [req.params.id]}}]}, function (err, count){
    if (err) return handleError(err);
    return res.json(200, {count:count});
  });
};

exports.addfollower = function (req, res) {
  User.findById(req.user._id, function (err, user){
    user.follows.push(req.body._id);
    user.save(function(err, user) {
      if (err) return validationError(res, err);
      return res.json(200);
    });
  });
};
exports.navbar = function (req, res) {
  User.findById(req.user._id,'menu_message menu_noti notifications' ,function (err, user){
    if(err) return res.send(500, err);
    res.json(200, user);
  });
};
exports.follows = function (req, res) {
  User.findById(req.user._id,'follows github_follows' ,function (err, user){
    if(err) return res.send(500, err);
    res.json(200, user);
  });
};
exports.noti = function (req, res){
  User.findById(req.user._id, function (err, user){
    user.menu_noti = false;
    user.save(function(err, user) {
      if (err) return  res.send(500, err);
      return res.json(200);
    });
  });
};
exports.message = function (req, res){
  User.findById(req.user._id, function (err, user){
    user.menu_message = false;
    user.save(function(err, user) {
      if (err) return  res.send(500, err);
      return res.json(200);
    });
  });
};

exports.removefollower = function (req, res) {
  User.findById(req.user._id, function (err, user){
    user.follows.pull(req.body._id);
    user.save(function(err, user) {
      if (err) return validationError(res, err);
      return res.json(200);
    });
  });
};
exports.github_addfollower = function (req, res) {
  User.findById(req.user._id, function (err, user){
    user.github_follows.push(req.body._id);
    user.save(function(err, user) {
      if (err) return validationError(res, err);
      return res.json(200);
    });
  });
};
exports.github_removefollower = function (req, res) {
  User.findById(req.user._id, function (err, user){
    user.github_follows.pull(req.body._id);
    user.save(function(err, user) {
      if (err) return validationError(res, err);
      return res.json(200);
    });
  });
};

/**
 * Deletes a user
 * restriction: 'admin'
 */
exports.destroy = function(req, res) {
  User.findByIdAndRemove(req.params.id, function(err, user) {
    if(err) return res.send(500, err);
    return res.send(204);
  });
};

/**
 * Change a users password
 */
exports.changePassword = function(req, res, next) {
  var userId = req.user._id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  User.findById(userId, function (err, user) {
    if(user.authenticate(oldPass)) {
      user.local.password = bcrypt.hashSync(newPass);
      user.save(function(err) {
        if (err) return validationError(res, err);
        res.send(200);
      });
    } else {
      res.send(403);
    }
  });
};

/**
 * Get my info
 */
exports.me = function(req, res, next) {
  var userId = req.user._id;
  User.findOne({
    _id: userId
  }, '-salt -hashedPassword', function(err, user) { // don't ever give out the password or salt
    if (err) return next(err);
    if (!user) return res.json(401);
    res.json(user);
  });
};

exports.searchs = function(req, res) {
  var token = new RegExp(req.params.id, 'i');
  User.find({$or: [{name: token},{"local.email": token}]}, 'name picture follows', function(err, user) {
    if (err) return next(err);
    if (!user) return res.json(401);
    res.json(user);
  });
};

/**
 * Authentication callback
 */
exports.authCallback = function(req, res, next) {
  res.redirect('/');
};


exports.image = function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('received upload:\n\n');
    res.end(util.inspect({fields: fields, files: files}));
  });

  form.on('end', function(fields, files) {
    var temp_path = this.openedFiles[0].path;
    var file_name = req.user._id+this.openedFiles[0].name;
    var new_location = 'client/assets/images/';
    User.findById(req.user._id, function (err, user) {
      if (err) return console.log(err);
      if (!user) return console.log('notfound');
      fs.exists(new_location+user.picture, function (exists) {
        if (exists && (user.picture != 'img.jpg')) {
          fs.unlink(new_location+user.picture, function (err) {
            if (err) throw err;
            gm(temp_path)
              .resize(300, 300)
              .noProfile()
              .write(new_location+file_name, function (err) {
                if (!err) {
                  user.picture = file_name;
                  user.save(function(err) {
                    if (err) return validationError(res, err);
                  });

                }
              });
          });
        }else {
          gm(temp_path)
            .resize(300, 300)
            .noProfile()
            .write(new_location+file_name, function (err) {
              if (!err) {
                user.picture = file_name;
                user.save(function(err) {
                  if (err) return validationError(res, err);

                });

              }
            });
        }
      });


    });


  });
};
function timerMethod() {
  User.find({"github.token": { $exists: true }}, 'github', function(err, users) {
    if (err) return err;
    if (!users) return res.json(401);
    users.forEach(function(user){
      user.githubApi().events.getFromUserPublic({
        user: user.github.profile.login
        //headers : {
        //  'If-None-Match' : '"da7e3a808716c4e2b82361b167226d69"' // naudoji etag
        //}
      }, function(err, res) {

        res.forEach(function(event){
          if(event.type === 'PushEvent') {
            Repo.findOneAndUpdate({id: event.id}, event, {upsert: true}, function (err, data) {
              //console.log(data);
            });
          }
        });
      });
      user.getGitHubReps();
    })
  });
}
var timerId = setInterval(timerMethod, 60000);
