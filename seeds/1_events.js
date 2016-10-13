'use strict';

exports.seed = function(knex) {
  return knex('events').del()
  .then(() => {
    return knex('events').insert([{
        id: 1,
        event_name: '',
        event_date: '',
        event_time: '',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }, {
        id: 2,
        event_name: '',
        event_date: '',
        event_time: '',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }, {
        id: 3,
        event_name: '',
        event_date: '',
        event_time: '',
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
