'use strict';

const boom = require('boom');
const express = require('express');
const knex = require('../knex');
const { camelizeKeys, decamelizeKeys } = require('humps');

const router = express.Router();

router.get('/skills', (req, res, next) => {
  knex('skills')
    .orderBy('skill')
    .then((rows) => {
      const skills = camelizeKeys(rows);

      res.send(skills);
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;
