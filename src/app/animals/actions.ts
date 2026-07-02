'use server';

import { db } from '@/db';
import { animals, animalTransactions, births, inseminations, pastureHistory } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createAnimal(formData: FormData) {
  const tagNumber = (formData.get('tagNumber') as string)?.trim() || null;
  const category = formData.get('category') as string;
  const currentPastureId = formData.get('currentPastureId') as string | null;
  const pastureId = currentPastureId ? Number(currentPastureId) : null;

  const [created] = await db.insert(animals).values({
    tagNumber: tagNumber || null,
    category: category as any,
    status: 'ACTIVE',
    currentPastureId: pastureId,
  }).returning({ id: animals.id });

  // Start pasture history entry if a pasture was chosen
  if (pastureId && created) {
    const today = new Date().toISOString().split('T')[0];
    await db.insert(pastureHistory).values({
      animalId: created.id,
      pastureId,
      enteredAt: today,
      exitedAt: null,
    });
  }

  revalidatePath('/animals');
  revalidatePath('/pastures');
}

export async function updateAnimal(id: number, formData: FormData) {
  const tagNumber = (formData.get('tagNumber') as string)?.trim() || null;
  const category = formData.get('category') as string;
  const status = formData.get('status') as string;
  const currentPastureId = formData.get('currentPastureId') as string | null;

  await db.update(animals)
    .set({
      tagNumber: tagNumber || null,
      category: category as any,
      status: status as any,
      currentPastureId: currentPastureId ? Number(currentPastureId) : null,
    })
    .where(eq(animals.id, id));

  revalidatePath('/animals');
  revalidatePath('/pastures');
  revalidatePath(`/animals/${id}`);
}

export async function moveAnimalToPasture(
  animalId: number,
  fromPastureId: number | null,
  toPastureId: number | null,
  moveDate: string | null,
) {
  const today = new Date().toISOString().split('T')[0];
  const effectiveDate = moveDate || today;

  // 1. Update animal's current pasture
  await db.update(animals)
    .set({ currentPastureId: toPastureId })
    .where(eq(animals.id, animalId));

  // 2. Record TRANSFER transaction (existing log)
  await db.insert(animalTransactions).values({
    animalId,
    type: 'TRANSFER',
    transactionDate: effectiveDate,
    fromPastureId,
    toPastureId,
    notes: null,
    monthLabel: null,
  });

  // 3. Close open pasture_history entries for this animal (only null exitedAt)
  await db.update(pastureHistory)
    .set({ exitedAt: effectiveDate })
    .where(and(
      eq(pastureHistory.animalId, animalId),
      isNull(pastureHistory.exitedAt),
    ));

  // 4. Open new pasture_history entry if moving to a pasture
  if (toPastureId) {
    await db.insert(pastureHistory).values({
      animalId,
      pastureId: toPastureId,
      enteredAt: effectiveDate,
      exitedAt: null,
    });
  }

  revalidatePath('/animals');
  revalidatePath('/pastures');
  revalidatePath(`/pastures/${fromPastureId}`);
  revalidatePath(`/pastures/${toPastureId}`);
  revalidatePath(`/animals/${animalId}`);
  revalidatePath('/transactions');
  revalidatePath('/pastures/historico');
  revalidatePath('/pastures/comparar');
}

export async function addVaccine(formData: FormData) {
  const animalId = Number(formData.get('animalId'));
  const vaccineName = (formData.get('vaccineName') as string)?.trim();
  const vaccineDate = (formData.get('vaccineDate') as string) || new Date().toISOString().split('T')[0];

  if (!animalId || !vaccineName) return;

  await db.insert(animalTransactions).values({
    animalId,
    type: 'VACCINE',
    transactionDate: vaccineDate,
    notes: vaccineName,
    monthLabel: null,
    fromPastureId: null,
    toPastureId: null,
  });

  revalidatePath(`/animals/${animalId}`);
  revalidatePath('/transactions');
}

export async function addInsemination(formData: FormData) {
  const animalId = Number(formData.get('animalId'));
  const inseminationDate = (formData.get('inseminationDate') as string) || new Date().toISOString().split('T')[0];
  const bullSemen = (formData.get('bullSemen') as string)?.trim() || null;
  const status = (formData.get('status') as string) || 'PENDING';
  const paid = formData.get('paid') === 'true';
  const observations = (formData.get('observations') as string)?.trim() || null;

  if (!animalId) return;

  await db.insert(inseminations).values({
    animalId,
    inseminationDate,
    bullSemen,
    status: status as any,
    paid,
    observations,
  });

  revalidatePath(`/animals/${animalId}`);
  revalidatePath('/inseminations');
}

export async function updateInsemination(id: number, formData: FormData) {
  const status = formData.get('status') as string;
  const paid = formData.get('paid') === 'true';
  const inseminationDate = formData.get('inseminationDate') as string;
  const observations = (formData.get('observations') as string)?.trim() || null;

  await db.update(inseminations)
    .set({ status: status as any, paid, inseminationDate, observations })
    .where(eq(inseminations.id, id));

  revalidatePath('/inseminations');
  revalidatePath('/animals');
}

export async function updateTransactionDate(txId: number, newDate: string) {
  await db.update(animalTransactions)
    .set({ transactionDate: newDate })
    .where(eq(animalTransactions.id, txId));

  revalidatePath('/transactions');
  revalidatePath('/animals');
}

export async function deleteAnimal(id: number) {
  await db.delete(animalTransactions).where(eq(animalTransactions.animalId, id));
  await db.delete(births).where(eq(births.motherId, id));
  await db.delete(inseminations).where(eq(inseminations.animalId, id));
  await db.delete(pastureHistory).where(eq(pastureHistory.animalId, id));
  await db.delete(animals).where(eq(animals.id, id));

  revalidatePath('/animals');
  revalidatePath('/pastures');
  revalidatePath('/inseminations');
}
