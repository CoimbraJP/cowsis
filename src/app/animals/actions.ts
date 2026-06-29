'use server';

import { db } from '@/db';
import { animals, animalTransactions, births, inseminations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createAnimal(formData: FormData) {
  const tagNumber = (formData.get('tagNumber') as string)?.trim() || null;
  const category = formData.get('category') as string;
  const currentPastureId = formData.get('currentPastureId') as string | null;

  await db.insert(animals).values({
    tagNumber: tagNumber || null,
    category: category as any,
    status: 'ACTIVE',
    currentPastureId: currentPastureId ? Number(currentPastureId) : null,
  });

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
  // Update the animal's current pasture
  await db.update(animals)
    .set({ currentPastureId: toPastureId })
    .where(eq(animals.id, animalId));

  // Register the transfer in transactions
  const today = new Date().toISOString().split('T')[0];
  await db.insert(animalTransactions).values({
    animalId,
    type: 'TRANSFER',
    transactionDate: moveDate || today,
    fromPastureId: fromPastureId,
    toPastureId: toPastureId,
    notes: null,
    monthLabel: null,
  });

  revalidatePath('/animals');
  revalidatePath('/pastures');
  revalidatePath(`/pastures/${fromPastureId}`);
  revalidatePath(`/pastures/${toPastureId}`);
  revalidatePath(`/animals/${animalId}`);
  revalidatePath('/transactions');
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
  await db.delete(animals).where(eq(animals.id, id));

  revalidatePath('/animals');
  revalidatePath('/pastures');
}
