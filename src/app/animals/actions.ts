'use server';

import { db } from '@/db';
import { animals, animalTransactions, births, inseminations, pastureHistory } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createAnimal(formData: FormData) {
  const tagNumber = (formData.get('tagNumber') as string)?.trim() || null;
  const category = formData.get('category') as string;
  const currentPastureId = formData.get('currentPastureId') as string | null;
  const pastureId = currentPastureId ? Number(currentPastureId) : null;
  const origin = (formData.get('origin') as string) || '';   // 'BIRTH' | 'ACQUISITION' | ''
  const originDate = (formData.get('originDate') as string) || new Date().toISOString().split('T')[0];

  const [created] = await db.insert(animals).values({
    tagNumber: tagNumber || null,
    category: category as any,
    status: 'ACTIVE',
    currentPastureId: pastureId,
    isPregnant: false,
  }).returning({ id: animals.id });

  if (pastureId && created) {
    await db.insert(pastureHistory).values({
      animalId: created.id,
      pastureId,
      enteredAt: originDate,
      exitedAt: null,
    });
  }

  if ((origin === 'BIRTH' || origin === 'ACQUISITION') && created) {
    await db.insert(animalTransactions).values({
      animalId: created.id,
      type: origin as any,
      transactionDate: originDate,
      notes: origin === 'BIRTH' ? 'Nascimento' : 'Aquisição',
      monthLabel: null,
    });
  }

  revalidatePath('/animals');
  revalidatePath('/pastures');
  redirect(`/animals/${created.id}`);
}

export async function updateAnimal(id: number, formData: FormData) {
  const tagNumber = (formData.get('tagNumber') as string)?.trim() || null;
  const category = formData.get('category') as string;
  const status = formData.get('status') as string;
  const currentPastureId = formData.get('currentPastureId') as string | null;
  const weightStr = formData.get('weight') as string | null;
  const healthNotes = (formData.get('healthNotes') as string)?.trim() || null;
  const isPregnant = formData.get('isPregnant') === 'true';

  await db.update(animals)
    .set({
      tagNumber: tagNumber || null,
      category: category as any,
      status: status as any,
      currentPastureId: currentPastureId ? Number(currentPastureId) : null,
      weight: weightStr ? Number(weightStr) : null,
      healthNotes,
      isPregnant,
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

  await db.update(animals)
    .set({ currentPastureId: toPastureId })
    .where(eq(animals.id, animalId));

  await db.insert(animalTransactions).values({
    animalId,
    type: 'TRANSFER',
    transactionDate: effectiveDate,
    fromPastureId,
    toPastureId,
    notes: null,
    monthLabel: null,
  });

  await db.update(pastureHistory)
    .set({ exitedAt: effectiveDate })
    .where(and(
      eq(pastureHistory.animalId, animalId),
      isNull(pastureHistory.exitedAt),
    ));

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

export async function deleteVaccine(txId: number, animalId: number) {
  await db.delete(animalTransactions).where(eq(animalTransactions.id, txId));
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

  // Validate: AGUARDANDO (PENDING) must have a future or today date
  if (status === 'PENDING') {
    const today = new Date().toISOString().split('T')[0];
    if (inseminationDate < today) return; // silently reject past dates for PENDING
  }

  if (!animalId) return;

  await db.insert(inseminations).values({
    animalId,
    inseminationDate,
    bullSemen,
    status: status as any,
    paid,
    observations,
  });

  // If confirming pregnancy, mark animal as pregnant
  if (status === 'CONFIRMED') {
    await db.update(animals).set({ isPregnant: true }).where(eq(animals.id, animalId));
  }

  revalidatePath(`/animals/${animalId}`);
  revalidatePath('/inseminations');
}

export async function updateInsemination(id: number, formData: FormData) {
  const status = formData.get('status') as string;
  const paid = formData.get('paid') === 'true';
  const inseminationDate = formData.get('inseminationDate') as string;
  const observations = (formData.get('observations') as string)?.trim() || null;
  const animalId = Number(formData.get('animalId'));

  await db.update(inseminations)
    .set({ status: status as any, paid, inseminationDate, observations })
    .where(eq(inseminations.id, id));

  // Sync isPregnant flag when status is updated
  if (animalId) {
    if (status === 'CONFIRMED') {
      await db.update(animals).set({ isPregnant: true }).where(eq(animals.id, animalId));
    }
  }

  revalidatePath('/inseminations');
  revalidatePath('/animals');
  if (animalId) revalidatePath(`/animals/${animalId}`);
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
