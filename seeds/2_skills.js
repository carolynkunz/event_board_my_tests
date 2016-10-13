'use strict';

exports.seed = function(knex) {
  return knex('skills').del()
    .then(() => {
      return knex('skills').insert([{
        id: 1,
        skill: '',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }, {
        id: 2,
        skill: '',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }, {
        id: 3,
        skill: '',
        created_at: new Date('2016-06-26 14:26:16 UTC'),
        updated_at: new Date('2016-06-26 14:26:16 UTC')
      }]);
    })
    .then(() => {
      return knex.raw(
        "SELECT setval('skills_id_seq', (SELECT MAX(id) FROM skills));"
      );
    });
};
