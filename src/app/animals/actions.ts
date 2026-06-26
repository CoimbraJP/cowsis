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

export async function moveAnimalToPasture(animalId: number, pastureId: number | null) {
  await db.update(animals)
    .set({ currentPastureId: pastureId })
    .where(eq(animals.id, animalId));

  revalidatePath('/animals');
  revalidatePath('/pastures');
}

export async function deleteAnimal(id: number) {
  // Delete child records first (FK constraints)
  await db.delete(animalTransactions).where(eq(animalTransactions.animalId, id));
  await db.delete(births).where(eq(births.motherId, id));
  await db.delete(inseminations).where(eq(inseminations.animalId, id));
  await db.delete(animals).where(eq(animals.id, id));

  revalidatePath('/animals');
  revalidatePath('/pastures');
}
