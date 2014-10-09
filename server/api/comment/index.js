'use strict';

var express = require('express');
var controller = require('./comment.controller');

var router = express.Router();

router.get('/:id/:limit', controller.index);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;