'use strict';

exports.seed = function(knex) {
  return knex('events_skills').del()
    .then(() => {
      return knex('events_skills').insert([{
        id: 1,
        event_id: 1,
        skill_id: 1,
        created_at: new Date('2016-06-29 14:26:16 UTC'),
        updated_at: new Date('2016-06-29 14:26:16 UTC')
      }]);
    })
    .then(() => {
      return knex.raw(
        "SELECT setval('events_skills_id_seq', (SELECT MAX(id) FROM events_skills));"
      );
    });
};
