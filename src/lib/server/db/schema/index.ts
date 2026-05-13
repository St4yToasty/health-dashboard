/**
 * Barrel re-export of every table, enum, view, and relation in the schema.
 * drizzle.config.ts points its `schema` field at this file so drizzle-kit
 * sees the whole graph in one place.
 *
 * One module per topic — keep tables grouped by domain.
 */

export * from './enums';
export * from './body';
export * from './nutrition';
export * from './activity';
export * from './system';
export * from './views';
