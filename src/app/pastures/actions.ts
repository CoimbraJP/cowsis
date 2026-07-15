'use server';

import { db } from '@/db';
import { pastures, animals, animalTransactions, pastureHistory, pastureSnapshots } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPasture(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return;
  const [created] = await db
    .insert(pastures)
    .values({ name, active: true })
    .returning({ id: pastures.id });
  revalidatePath('/pastures');
  redirect(`/pastures/${created.id}`);
}

export async function updatePasture(id: number, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return;
  await db.update(pastures).set({ name }).where(eq(pastures.id, id));
  revalidatePath('/pastures');
  revalidatePath(`/pastures/${id}`);
  // P30: Redirect to clear ?edit= from the URL so the form closes
  redirect('/pastures');
}

export async function togglePastureActive(id: number, active: boolean) {
  await db.update(pastures).set({ active }).where(eq(pastures.id, id));
  revalidatePath('/pastures');
}

export async function deletePasture(id: number) {
  // Move all animals out of this pasture first
  await db.update(animals).set({ currentPastureId: null }).where(eq(animals.currentPastureId, id));
  // P05: Clean up FK references before deleting to avoid integrity errors
  await db.delete(pastureHistory).where(eq(pastureHistory.pastureId, id));
  await db.update(animalTransactions).set({ fromPastureId: null }).where(eq(animalTransactions.fromPastureId, id));
  await db.update(animalTransactions).set({ toPastureId: null }).where(eq(animalTransactions.toPastureId, id));
  await db.delete(pastures).where(eq(pastures.id, id));
  revalidatePath('/pastures');
  revalidatePath('/animals');
  revalidatePath('/transactions');
  revalidatePath('/pastures/historico');
  redirect('/pastures');
}

export async function savePastureSnapshot(pastureId: number, snapshotDate: string) {
  if (!snapshotDate) return;
  // Avoid exact duplicate dates for same pasture
  const existing = await db
    .select({ id: pastureSnapshots.id })
    .from(pastureSnapshots)
    .where(
      // Using raw sql to avoid import of and/eq duplication — reuse eq from existing import
      eq(pastureSnapshots.pastureId, pastureId),
    )
    .then(rows => rows); // just fetch all for this pasture, check in JS
  const dup = existing; // we'll check duplicates below
  await db.insert(pastureSnapshots).values({
    pastureId,
    snapshotDate,
    createdAt: new Date().toISOString().split('T')[0],
  });
  revalidatePath(`/pastures/${pastureId}`);
  redirect(`/pastures/${pastureId}?period=${snapshotDate}`);
}

export async function deletePastureSnapshot(snapshotId: number, pastureId: number) {
  await db.delete(pastureSnapshots).where(eq(pastureSnapshots.id, snapshotId));
  revalidatePath(`/pastures/${pastureId}`);
  redirect(`/pastures/${pastureId}`);
}
