'use strict';

const boom = require('boom');
const express = require('express');
const knex = require('../knex');
const { camelizeKeys, decamelizeKeys } = require('humps');

const router = express.Router();

router.get('/events', (_req, res, next) => {
  knex('events')
    .orderBy('event_name')
    .then((rows) => {
      const events = camelizeKeys(rows);

      res.send(events);
    })
    .catch((err) => {
      next(err);
    });
});

router.get('/events/:id', (req, res, next) => {
  knex('events')
  .where('id', req.params.id)
  .first()
  .then((row) => {
    if (!row) {
      throw boom.create(404, 'Not Found');
    }

    const event = camelizeKeys(row);

    res.send(event);
  })
  .catch((err) => {
    next(err);
  });
});

router.post('/events', (req, res, next) => {
  const { eventName, eventDate, eventTime, eventRsvp } = req.body;

  if (!eventName || !eventName.trim()) {
    return next(boom.create(400, 'Event name must not be blank'));
  }

  if (!eventDate || !eventDate.trim()) {
    return next(boom.create(400, 'Event date must not be blank'));
  }

  if (!eventTime || !eventTime.trim()) {
    return next(boom.create(400, 'Event time must not be blank'));
  }

  if (!eventRsvp || !eventRsvp.trim()) {
    return next(boom.create(400, 'Event RSVP must not be blank'));
  }


  const insertEvent = { eventName, eventDate, eventTime, eventRsvp };

  knex('events')
    .insert(decamelizeKeys(insertEvent), '*')
    .then((rows) => {
      const event = camelizeKeys(rows[0]);

      res.send(event);
    })
    .catch((err) => {
      next(err);
    });
});

router.patch('/events/:id', (req, res, next) => {
  knex('events')
    .where('id', req.params.id)
    .first()
    .then((event) => {
      if (!event) {
        throw boom.create(404, 'Not Found');
      }

      const { eventName, eventDate, eventTime, eventRsvp } = req.body;
      const updateEvent = {};

      if (eventName) {
        updateEvent.eventName = eventName;
      }

      if (eventDate) {
        updateEvent.eventDate = eventDate;
      }

      if (eventTime) {
        updateEvent.eventTime = eventTime;
      }

      if (eventRsvp) {
        updateEvent.eventRsvp = eventRsvp;
      }

      return knex('events')
        .update(decamelizeKeys(updateEvent), '*')
        .where('id', req.params.id);
    })
    .then((rows) => {
      const event = camelizeKeys(rows[0]);

      res.send(event);
    })
    .catch((err) => {
      next(err);
    });
});

router.delete('/events/:id', (req, res, next) => {
  let event;

  knex('events')
    .where('id', req.params.id)
    .first()
    .then((row) => {
      if (!row) {
        throw boom.create(404, 'Not Found');
      }

      event = camelizeKeys(row);

      return knex('events')
        .del()
        .where('id', req.params.id);
    })
    .then(() => {
      delete event.id;

      res.send(event);
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;
