'use server';

import { db } from '@/db';
import { animals, countingItems, countingSessions, pastures } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function startSession(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const today = new Date().toISOString().split('T')[0];

  if (!name) return;

  // Auto-finish any existing ACTIVE session
  const activeSessions = await db
    .select({ id: countingSessions.id })
    .from(countingSessions)
    .where(eq(countingSessions.status, 'ACTIVE'));

  if (activeSessions.length > 0) {
    await db
      .update(countingSessions)
      .set({ status: 'COMPLETED', finishedAt: today })
      .where(eq(countingSessions.status, 'ACTIVE'));
  }

  // Create new session
  const [session] = await db
    .insert(countingSessions)
    .values({ name, startedAt: today, status: 'ACTIVE' })
    .returning({ id: countingSessions.id });

  // Snapshot all active animals
  const activeAnimals = await db
    .select({ id: animals.id, currentPastureId: animals.currentPastureId })
    .from(animals)
    .where(eq(animals.status, 'ACTIVE'));

  if (activeAnimals.length > 0) {
    await db.insert(countingItems).values(
      activeAnimals.map((a) => ({
        sessionId: session.id,
        animalId: a.id,
        snapshotPastureId: a.currentPastureId,
        status: 'UNTREATED',
      })),
    );
  }

  revalidatePath('/inventario');
  redirect(`/inventario/${session.id}`);
}

export async function confirmAnimal(sessionId: number, animalId: number) {
  await db
    .update(countingItems)
    .set({ status: 'CONFIRMED', updatedAt: new Date().toISOString().split('T')[0] })
    .where(
      and(
        eq(countingItems.sessionId, sessionId),
        eq(countingItems.animalId, animalId),
      ),
    );
  revalidatePath(`/inventario/${sessionId}`);
}

export async function moveAnimalSession(
  sessionId: number,
  animalId: number,
  toPastureId: number,
) {
  await db
    .update(countingItems)
    .set({
      status: 'MOVED',
      resolvedPastureId: toPastureId,
      updatedAt: new Date().toISOString().split('T')[0],
    })
    .where(
      and(
        eq(countingItems.sessionId, sessionId),
        eq(countingItems.animalId, animalId),
      ),
    );
  revalidatePath(`/inventario/${sessionId}`);
}

export async function resolveAnimal(
  sessionId: number,
  animalId: number,
  resolution: string,
  notes: string | null,
) {
  await db
    .update(countingItems)
    .set({
      status: resolution,
      notes,
      updatedAt: new Date().toISOString().split('T')[0],
    })
    .where(
      and(
        eq(countingItems.sessionId, sessionId),
        eq(countingItems.animalId, animalId),
      ),
    );
  revalidatePath(`/inventario/${sessionId}`);
}

export async function finishSession(sessionId: number) {
  const today = new Date().toISOString().split('T')[0];
  await db
    .update(countingSessions)
    .set({ status: 'COMPLETED', finishedAt: today })
    .where(eq(countingSessions.id, sessionId));

  revalidatePath('/inventario');
  revalidatePath(`/inventario/${sessionId}`);
  redirect(`/inventario/${sessionId}`);
}
