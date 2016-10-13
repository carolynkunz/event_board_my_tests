'use strict';

exports.up = function(knex) {
  return knex.schema.createTable('events_skills', (table) => {
    table.increments();
    table.integer('event_id')
      .notNullable()
      .references('id')
      .inTable('events')
      .onDelete('CASCADE')
      .index();
    table.integer('skill_id')
      .notNullable()
      .references('id')
      .inTable('skills')
      .onDelete();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('events_skills');
};
