'use server';

import { db } from '@/db';
import { pastures } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createPasture(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return;
  await db.insert(pastures).values({ name, active: true });
  revalidatePath('/pastures');
}

export async function updatePasture(id: number, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return;
  await db.update(pastures).set({ name }).where(eq(pastures.id, id));
  revalidatePath('/pastures');
  revalidatePath(`/pastures/${id}`);
}

export async function togglePastureActive(id: number, active: boolean) {
  await db.update(pastures).set({ active }).where(eq(pastures.id, id));
  revalidatePath('/pastures');
}
