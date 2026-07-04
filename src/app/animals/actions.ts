'use server';

import { db } from '@/db';
import { animals, animalTransactions, births, inseminations, pastureHistory, pastureInventoryItems } from '@/db/schema';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createAnimal(formData: FormData) {
  const tagNumber = (formData.get('tagNumber') as string)?.trim() || null;
  const category = formData.get('category') as string;
  const currentPastureId = formData.get('currentPastureId') as string | null;
  const pastureId = currentPastureId ? Number(currentPastureId) : null;
  const origin = (formData.get('origin') as string) || '';
  const originDate = (formData.get('originDate') as string) || new Date().toISOString().split('T')[0];

  // P17: Check for duplicate tag number
  if (tagNumber) {
    const [existing] = await db.select({ id: animals.id }).from(animals)
      .where(eq(animals.tagNumber, tagNumber)).limit(1);
    if (existing) {
      redirect(`/animals/new?error=duplicate_tag&tag=${encodeURIComponent(tagNumber)}`);
    }
  }

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

  // Fetch current state to detect changes (P08, P09)
  const [current] = await db
    .select({ status: animals.status, currentPastureId: animals.currentPastureId })
    .from(animals).where(eq(animals.id, id)).limit(1);

  const today = new Date().toISOString().split('T')[0];
  const newPastureId = currentPastureId ? Number(currentPastureId) : null;
  const prevPastureId = current?.currentPastureId ?? null;
  const prevStatus = current?.status ?? 'ACTIVE';

  // P09: sold/dead animals leave their pasture
  const effectivePastureId = (status === 'SOLD' || status === 'DEAD') ? null : newPastureId;

  await db.update(animals).set({
    tagNumber: tagNumber || null,
    category: category as any,
    status: status as any,
    currentPastureId: effectivePastureId,
    weight: weightStr ? Number(weightStr) : null,
    healthNotes,
    isPregnant,
  }).where(eq(animals.id, id));

  // P08: If still ACTIVE and pasture changed, register the transfer
  if (status === 'ACTIVE' && effectivePastureId !== prevPastureId) {
    if (prevPastureId) {
      await db.update(pastureHistory).set({ exitedAt: today })
        .where(and(eq(pastureHistory.animalId, id), isNull(pastureHistory.exitedAt)));
    }
    if (effectivePastureId) {
      await db.insert(pastureHistory).values({
        animalId: id, pastureId: effectivePastureId, enteredAt: today, exitedAt: null,
      });
    }
    await db.insert(animalTransactions).values({
      animalId: id, type: 'TRANSFER', transactionDate: today,
      fromPastureId: prevPastureId, toPastureId: effectivePastureId,
      notes: 'Transferência via formulário', monthLabel: null,
    });
  }

  // P09: If status changed to SOLD/DEAD and was previously ACTIVE, close pasture history
  if ((status === 'SOLD' || status === 'DEAD') && prevStatus === 'ACTIVE' && prevPastureId) {
    await db.update(pastureHistory).set({ exitedAt: today })
      .where(and(eq(pastureHistory.animalId, id), isNull(pastureHistory.exitedAt)));
  }

  revalidatePath('/animals');
  revalidatePath('/pastures');
  revalidatePath(`/animals/${id}`);
  if (prevPastureId) revalidatePath(`/pastures/${prevPastureId}`);
  if (effectivePastureId) revalidatePath(`/pastures/${effectivePastureId}`);
}

export async function moveAnimalToPasture(
  animalId: number,
  fromPastureId: number | null,
  toPastureId: number | null,
  moveDate: string | null,
) {
  // P15: Guard against same-pasture move
  if (fromPastureId !== null && toPastureId !== null && fromPastureId === toPastureId) return;

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

  // P02: Removed the silent rejection of past dates for PENDING status.
  // Past dates are valid (insemination done yesterday should be recordable).

  if (!animalId) return;

  await db.insert(inseminations).values({
    animalId,
    inseminationDate,
    bullSemen,
    status: status as any,
    paid,
    observations,
  });

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
  const bullSemen = (formData.get('bullSemen') as string)?.trim() || null;

  await db.update(inseminations)
    .set({ status: status as any, paid, inseminationDate, observations, bullSemen })
    .where(eq(inseminations.id, id));

  // P10: Sync isPregnant flag with insemination status
  if (animalId) {
    if (status === 'CONFIRMED') {
      await db.update(animals).set({ isPregnant: true }).where(eq(animals.id, animalId));
    } else {
      // Check if any OTHER insemination for this animal is still CONFIRMED
      const [otherConfirmed] = await db.select({ id: inseminations.id })
        .from(inseminations)
        .where(and(
          eq(inseminations.animalId, animalId),
          eq(inseminations.status, 'CONFIRMED'),
          ne(inseminations.id, id),
        )).limit(1);
      if (!otherConfirmed) {
        await db.update(animals).set({ isPregnant: false }).where(eq(animals.id, animalId));
      }
    }
  }

  revalidatePath('/inseminations');
  revalidatePath('/animals');
  if (animalId) revalidatePath(`/animals/${animalId}`);
}

// P04: Register a sale or death with value
export async function registerEvent(formData: FormData) {
  const animalId = Number(formData.get('animalId'));
  const type = formData.get('type') as 'SALE' | 'DEATH';
  const transactionDate = (formData.get('transactionDate') as string) || new Date().toISOString().split('T')[0];
  const amountStr = formData.get('amount') as string | null;
  const notes = (formData.get('notes') as string)?.trim() || null;

  if (!animalId || !type) return;

  const amount = amountStr ? Number(amountStr) : null;
  const newStatus = type === 'SALE' ? 'SOLD' : 'DEAD';

  // Get current pasture
  const [animal] = await db.select({ currentPastureId: animals.currentPastureId, status: animals.status })
    .from(animals).where(eq(animals.id, animalId)).limit(1);

  const today = new Date().toISOString().split('T')[0];

  // Create the transaction record
  await db.insert(animalTransactions).values({
    animalId, type, transactionDate,
    amount: amount ?? null,
    notes,
    monthLabel: null,
  });

  // Update animal status and clear pasture
  await db.update(animals)
    .set({ status: newStatus as any, currentPastureId: null })
    .where(eq(animals.id, animalId));

  // Close pastureHistory if animal was in a pasture
  if (animal?.currentPastureId) {
    await db.update(pastureHistory).set({ exitedAt: transactionDate })
      .where(and(eq(pastureHistory.animalId, animalId), isNull(pastureHistory.exitedAt)));
  }

  revalidatePath(`/animals/${animalId}`);
  revalidatePath('/animals');
  revalidatePath('/transactions');
  revalidatePath('/pastures');
}

// P03: Register a birth/parto
export async function registerBirth(formData: FormData) {
  const animalId = Number(formData.get('animalId'));
  const birthDate = (formData.get('birthDate') as string) || new Date().toISOString().split('T')[0];
  const offspringGender = (formData.get('offspringGender') as string) || null;
  const status = (formData.get('birthStatus') as string) || 'ALIVE';
  const observations = (formData.get('observations') as string)?.trim() || null;

  if (!animalId) return;

  await db.insert(births).values({
    motherId: animalId,
    birthDate,
    offspringGender,
    status: status as any,
    observations,
  });

  // If alive, record as a BIRTH transaction on the mother
  await db.insert(animalTransactions).values({
    animalId,
    type: 'BIRTH',
    transactionDate: birthDate,
    notes: observations ?? `Parto ${offspringGender === 'M' ? 'Macho' : offspringGender === 'F' ? 'Fêmea' : ''}`.trim(),
    monthLabel: null,
  });

  // P10: After birth, if the insemination was CONFIRMED, update it to show birth happened
  // Mark the mother as no longer pregnant
  await db.update(animals).set({ isPregnant: false }).where(eq(animals.id, animalId));

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
  // P06: Delete inventory items first (imported animals have these)
  await db.delete(pastureInventoryItems).where(eq(pastureInventoryItems.animalId, id));
  await db.delete(animalTransactions).where(eq(animalTransactions.animalId, id));
  await db.delete(births).where(eq(births.motherId, id));
  await db.delete(inseminations).where(eq(inseminations.animalId, id));
  await db.delete(pastureHistory).where(eq(pastureHistory.animalId, id));
  await db.delete(animals).where(eq(animals.id, id));

  revalidatePath('/animals');
  revalidatePath('/pastures');
  revalidatePath('/inseminations');
  revalidatePath('/transactions');
  // P07: Redirect after delete so user doesn't get 404
  redirect('/animals');
}
