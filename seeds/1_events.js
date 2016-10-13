'use strict';

exports.seed = function(knex) {
  return knex('events').del()
  .then(() => {
    return knex('events').insert([{
        id: 1,
        event_name: 'JS Hackers',
        event_date: 'Monday, October 10th',
        event_time: '6:00 pm',
        event_rsvp: 'Meet Up',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }, {
        id: 2,
        event_name: '',
        event_date: '',
        event_time: '',
        event_rsvp: '',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }, {
        id: 3,
        event_name: '',
        event_date: '',
        event_time: '',
        event_rsvp: '',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }]);
    })
    .then(() => {
      return knex.raw(
        "SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));"
      );
    });
};
