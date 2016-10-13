'use strict';

exports.up = function(knex) {
  return knex.schema.createTable('events', (table) => {
    table.increments();
    table.string('event_name').notNullable().defaultTo('');
    table.string('event_date').notNullable().defaultTo('');
    table.string('event_time').notNullable().defaultTo('');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('events');
};
