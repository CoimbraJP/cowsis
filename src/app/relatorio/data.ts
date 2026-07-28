import { db } from '@/db';
import { animals, pastures, inseminations, animalTransactions } from '@/db/schema';
import { eq, and, or, gte, lte, sql, asc, desc } from 'drizzle-orm';

export type Range = { from: string; to: string; pid: number | null };

/* ─────────────  Shared  ───────────── */

export async function getPastures() {
  return db.select({ id: pastures.id, name: pastures.name, active: pastures.active })
    .from(pastures).orderBy(pastures.name);
}

/* ─────────────  Rebanho atual  ───────────── */

export async function getRebanho(pid: number | null) {
  const byCat = await db
    .select({ category: animals.category, count: sql<number>`count(*)::int` })
    .from(animals)
    .where(and(eq(animals.status, 'ACTIVE'), pid ? eq(animals.currentPastureId, pid) : undefined))
    .groupBy(animals.category)
    .orderBy(animals.category);

  const byPasture = pid ? [] : await db
    .select({ pastureId: animals.currentPastureId, count: sql<number>`count(*)::int` })
    .from(animals)
    .where(eq(animals.status, 'ACTIVE'))
    .groupBy(animals.currentPastureId);

  const [pregnant] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(animals)
    .where(and(
      eq(animals.status, 'ACTIVE'),
      eq(animals.isPregnant, true),
      pid ? eq(animals.currentPastureId, pid) : undefined,
    ));

  return {
    byCat: byCat.map(r => ({ ...r, count: Number(r.count) })),
    byPasture: byPasture.map(r => ({ ...r, count: Number(r.count) })),
    pregnant: Number(pregnant?.count ?? 0),
    total: byCat.reduce((s, r) => s + Number(r.count), 0),
  };
}

/* ─────────────  Mortes  ───────────── */

export async function getMortes({ from, to, pid }: Range) {
  return db.select({
    id:        animalTransactions.id,
    date:      animalTransactions.transactionDate,
    notes:     animalTransactions.notes,
    amount:    animalTransactions.amount,
    animalId:  animalTransactions.animalId,
    tagNumber: animals.tagNumber,
    category:  animals.category,
    pastureId: animalTransactions.fromPastureId,
  })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      eq(animalTransactions.type, 'DEATH'),
      gte(animalTransactions.transactionDate, from),
      lte(animalTransactions.transactionDate, to),
      pid ? eq(animalTransactions.fromPastureId, pid) : undefined,
    ))
    .orderBy(desc(animalTransactions.transactionDate), desc(animalTransactions.id));
}

/* ─────────────  Nascimentos  ───────────── */

export async function getNascimentos({ from, to, pid }: Range) {
  return db.select({
    id:        animalTransactions.id,
    date:      animalTransactions.transactionDate,
    notes:     animalTransactions.notes,
    animalId:  animalTransactions.animalId,
    tagNumber: animals.tagNumber,
    category:  animals.category,
    status:    animals.status,
    pastureId: animals.currentPastureId,
  })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      eq(animalTransactions.type, 'BIRTH'),
      gte(animalTransactions.transactionDate, from),
      lte(animalTransactions.transactionDate, to),
      pid ? or(eq(animals.currentPastureId, pid), eq(animalTransactions.toPastureId, pid)) : undefined,
    ))
    .orderBy(desc(animalTransactions.transactionDate), desc(animalTransactions.id));
}

/* ─────────────  Vendas  ───────────── */

export async function getVendas({ from, to, pid }: Range) {
  return db.select({
    id:        animalTransactions.id,
    date:      animalTransactions.transactionDate,
    notes:     animalTransactions.notes,
    amount:    animalTransactions.amount,
    animalId:  animalTransactions.animalId,
    tagNumber: animals.tagNumber,
    category:  animals.category,
    pastureId: animalTransactions.fromPastureId,
  })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      eq(animalTransactions.type, 'SALE'),
      gte(animalTransactions.transactionDate, from),
      lte(animalTransactions.transactionDate, to),
      pid ? eq(animalTransactions.fromPastureId, pid) : undefined,
    ))
    .orderBy(desc(animalTransactions.transactionDate), desc(animalTransactions.id));
}

/* ─────────────  Aquisições  ───────────── */

export async function getAquisicoes({ from, to, pid }: Range) {
  return db.select({
    id:        animalTransactions.id,
    date:      animalTransactions.transactionDate,
    notes:     animalTransactions.notes,
    amount:    animalTransactions.amount,
    animalId:  animalTransactions.animalId,
    tagNumber: animals.tagNumber,
    category:  animals.category,
    pastureId: animals.currentPastureId,
  })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      eq(animalTransactions.type, 'ACQUISITION'),
      gte(animalTransactions.transactionDate, from),
      lte(animalTransactions.transactionDate, to),
      pid ? eq(animals.currentPastureId, pid) : undefined,
    ))
    .orderBy(desc(animalTransactions.transactionDate));
}

/* ─────────────  Inseminações  ───────────── */

export async function getInseminacoes({ from, to, pid }: Range) {
  return db.select({
    id:        inseminations.id,
    date:      inseminations.inseminationDate,
    bullSemen: inseminations.bullSemen,
    status:    inseminations.status,
    paid:      inseminations.paid,
    outcome:   inseminations.outcome,
    obs:       inseminations.observations,
    animalId:  inseminations.animalId,
    tagNumber: animals.tagNumber,
    category:  animals.category,
    isPregnant: animals.isPregnant,
    pastureId: animals.currentPastureId,
  })
    .from(inseminations)
    .leftJoin(animals, eq(inseminations.animalId, animals.id))
    .where(and(
      gte(inseminations.inseminationDate, from),
      lte(inseminations.inseminationDate, to),
      pid ? eq(animals.currentPastureId, pid) : undefined,
    ))
    .orderBy(desc(inseminations.inseminationDate), desc(inseminations.id));
}

/* ─────────────  Movimentações (todas)  ───────────── */

export async function getMovimentacoes({ from, to, pid }: Range) {
  return db.select({
    id:        animalTransactions.id,
    type:      animalTransactions.type,
    date:      animalTransactions.transactionDate,
    notes:     animalTransactions.notes,
    amount:    animalTransactions.amount,
    animalId:  animalTransactions.animalId,
    tagNumber: animals.tagNumber,
    category:  animals.category,
    fromPastureId: animalTransactions.fromPastureId,
    toPastureId:   animalTransactions.toPastureId,
  })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      gte(animalTransactions.transactionDate, from),
      lte(animalTransactions.transactionDate, to),
      pid ? or(
        eq(animalTransactions.fromPastureId, pid),
        eq(animalTransactions.toPastureId, pid),
        eq(animals.currentPastureId, pid),
      ) : undefined,
    ))
    .orderBy(desc(animalTransactions.transactionDate), desc(animalTransactions.id));
}

/* ─────────────  Detalhe de pasto  ───────────── */

export async function getAnimaisDoPasto(pid: number | null) {
  return db.select({
    id:         animals.id,
    tagNumber:  animals.tagNumber,
    category:   animals.category,
    weight:     animals.weight,
    healthNotes: animals.healthNotes,
    isPregnant: animals.isPregnant,
    pastureId:  animals.currentPastureId,
    pastureName: pastures.name,
  })
    .from(animals)
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(and(
      eq(animals.status, 'ACTIVE'),
      pid ? eq(animals.currentPastureId, pid) : undefined,
    ))
    .orderBy(asc(pastures.name), asc(animals.tagNumber));
}

/* ─────────────  Inventário completo (Excel)  ───────────── */

export async function getTodosAnimais() {
  return db.select({
    id:          animals.id,
    tagNumber:   animals.tagNumber,
    category:    animals.category,
    status:      animals.status,
    weight:      animals.weight,
    isPregnant:  animals.isPregnant,
    healthNotes: animals.healthNotes,
    pastureName: pastures.name,
  })
    .from(animals)
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .orderBy(asc(animals.tagNumber));
}
