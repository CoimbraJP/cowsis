import { pgTable, serial, varchar, boolean, integer, date, text, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const animalCategoryEnum = pgEnum('animal_category', ['VACA', 'BEZERRO', 'BEZERRA', 'TOURO', 'NOVILHA', 'NOVILHO', 'BÚFALO', 'BÚFALA']);
export const animalStatusEnum = pgEnum('animal_status', ['ACTIVE', 'SOLD', 'DEAD']);
export const birthStatusEnum = pgEnum('birth_status', ['ALIVE', 'STILLBORN']);
export const insemStatusEnum = pgEnum('insem_status', ['PENDING', 'CONFIRMED', 'FAILED']);
export const transactionTypeEnum = pgEnum('transaction_type', ['SALE', 'DEATH', 'BIRTH', 'ACQUISITION', 'TRANSFER', 'VACCINE']);

// Tables
export const pastures = pgTable('pastures', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  active: boolean('active').default(true).notNull(),
});

export const animals = pgTable('animals', {
  id: serial('id').primaryKey(),
  tagNumber: varchar('tag_number', { length: 100 }),
  category: animalCategoryEnum('category').notNull(),
  status: animalStatusEnum('status').default('ACTIVE').notNull(),
  currentPastureId: integer('current_pasture_id').references(() => pastures.id),
  weight: real('weight'),
  healthNotes: text('health_notes'),
});

export const pastureInventories = pgTable('pasture_inventories', {
  id: serial('id').primaryKey(),
  inventoryDate: date('inventory_date'),
  name: varchar('name', { length: 255 }),
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
  status: insemStatusEnum('status').default('PENDING'),
  paid: boolean('paid').default(false).notNull(),
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
  amount: real('amount'),
  fromPastureId: integer('from_pasture_id').references(() => pastures.id),
  toPastureId:   integer('to_pasture_id').references(() => pastures.id),
});

export const pastureHistory = pgTable('pasture_history', {
  id: serial('id').primaryKey(),
  animalId: integer('animal_id').references(() => animals.id).notNull(),
  pastureId: integer('pasture_id').references(() => pastures.id),
  enteredAt: date('entered_at').notNull(),
  exitedAt:  date('exited_at'),
});

// Relations
export const pasturesRelations = relations(pastures, ({ many }) => ({
  animals: many(animals),
  inventories: many(pastureInventories),
  history: many(pastureHistory),
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
  pastureHistory: many(pastureHistory),
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
  fromPasture: one(pastures, {
    fields: [animalTransactions.fromPastureId],
    references: [pastures.id],
    relationName: 'fromPasture',
  }),
  toPasture: one(pastures, {
    fields: [animalTransactions.toPastureId],
    references: [pastures.id],
    relationName: 'toPasture',
  }),
}));

export const pastureHistoryRelations = relations(pastureHistory, ({ one }) => ({
  animal: one(animals, {
    fields: [pastureHistory.animalId],
    references: [animals.id],
  }),
  pasture: one(pastures, {
    fields: [pastureHistory.pastureId],
    references: [pastures.id],
  }),
}));
