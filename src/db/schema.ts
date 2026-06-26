import { pgTable, serial, varchar, boolean, integer, date, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const animalCategoryEnum = pgEnum('animal_category', ['VACA', 'BEZERRO', 'BEZERRA', 'TOURO', 'NOVILHA', 'NOVILHO', 'BÚFALO', 'BÚFALA']);
export const animalStatusEnum = pgEnum('animal_status', ['ACTIVE', 'SOLD', 'DEAD']);
export const birthStatusEnum = pgEnum('birth_status', ['ALIVE', 'STILLBORN']);
export const insemStatusEnum = pgEnum('insem_status', ['PENDING', 'CONFIRMED', 'FAILED']);
export const transactionTypeEnum = pgEnum('transaction_type', ['SALE', 'DEATH', 'BIRTH', 'ACQUISITION']);

// Tables
export const pastures = pgTable('pastures', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  active: boolean('active').default(true).notNull(),
});

export const animals = pgTable('animals', {
  id: serial('id').primaryKey(),
  tagNumber: varchar('tag_number', { length: 100 }), // can be null or "sem brinco"
  category: animalCategoryEnum('category').notNull(),
  status: animalStatusEnum('status').default('ACTIVE').notNull(),
  currentPastureId: integer('current_pasture_id').references(() => pastures.id),
});

export const pastureInventories = pgTable('pasture_inventories', {
  id: serial('id').primaryKey(),
  inventoryDate: date('inventory_date'),
  name: varchar('name', { length: 255 }), // e.g., "JANEIRO", "2026-06-10"
  pastureId: integer('pasture_id').references(() => pastures.id).notNull(),
  observations: text('observations'),
});

export const pastureInventoryItems = pgTable('pasture_inventory_items', {
  id: serial('id').primaryKey(),
  inventoryId: integer('inventory_id').references(() => pastureInventories.id).notNull(),
  animalId: integer('animal_id').references(() => animals.id).notNull(),
});

export const births = pgTable('births', {
  id: serial('id').primaryKey(),
  motherId: integer('mother_id').references(() => animals.id).notNull(),
  birthDate: date('birth_date'),
  offspringGender: varchar('offspring_gender', { length: 50 }),
  status: birthStatusEnum('status'),
  observations: text('observations'),
});

export const inseminations = pgTable('inseminations', {
  id: serial('id').primaryKey(),
  animalId: integer('animal_id').references(() => animals.id).notNull(),
  inseminationDate: date('insemination_date'),
  bullSemen: varchar('bull_semen', { length: 255 }),
  status: insemStatusEnum('status'),
  outcome: varchar('outcome', { length: 255 }),
  observations: text('observations'),
});

export const animalTransactions = pgTable('animal_transactions', {
  id: serial('id').primaryKey(),
  animalId: integer('animal_id').references(() => animals.id).notNull(),
  type: transactionTypeEnum('type').notNull(),
  transactionDate: date('transaction_date'),
  monthLabel: varchar('month_label', { length: 50 }),
  notes: text('notes'),
});

// Relations
export const pasturesRelations = relations(pastures, ({ many }) => ({
  animals: many(animals),
  inventories: many(pastureInventories),
}));

export const animalsRelations = relations(animals, ({ one, many }) => ({
  currentPasture: one(pastures, {
    fields: [animals.currentPastureId],
    references: [pastures.id],
  }),
  births: many(births),
  inseminations: many(inseminations),
  transactions: many(animalTransactions),
  inventoryItems: many(pastureInventoryItems),
}));

export const pastureInventoriesRelations = relations(pastureInventories, ({ one, many }) => ({
  pasture: one(pastures, {
    fields: [pastureInventories.pastureId],
    references: [pastures.id],
  }),
  items: many(pastureInventoryItems),
}));

export const pastureInventoryItemsRelations = relations(pastureInventoryItems, ({ one }) => ({
  inventory: one(pastureInventories, {
    fields: [pastureInventoryItems.inventoryId],
    references: [pastureInventories.id],
  }),
  animal: one(animals, {
    fields: [pastureInventoryItems.animalId],
    references: [animals.id],
  }),
}));

export const birthsRelations = relations(births, ({ one }) => ({
  mother: one(animals, {
    fields: [births.motherId],
    references: [animals.id],
  }),
}));

export const inseminationsRelations = relations(inseminations, ({ one }) => ({
  animal: one(animals, {
    fields: [inseminations.animalId],
    references: [animals.id],
  }),
}));

export const animalTransactionsRelations = relations(animalTransactions, ({ one }) => ({
  animal: one(animals, {
    fields: [animalTransactions.animalId],
    references: [animals.id],
  }),
}));
