'use strict';

exports.up = function(knex) {
  return knex.schema.createTable('skills', (table) => {
    table.increments();
    table.string('skill').notNullable().defaultTo('');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('skills');
};
