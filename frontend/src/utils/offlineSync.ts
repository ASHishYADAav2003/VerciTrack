import Dexie, { Table } from 'dexie';

export interface PendingBatch {
  id?: number;
  tempId: string;
  productName: string;
  origin: string;
  farmerId: string;
  imageBlob: Blob;
  timestamp: number;
}

export class OfflineDB extends Dexie {
  pendingBatches!: Table<PendingBatch>;

  constructor() {
    super('AgriTrustOfflineDB');
    this.version(1).stores({
      pendingBatches: '++id, tempId, timestamp' // Primary key and indexed props
    });
  }
}

export const db = new OfflineDB();

export async function savePendingBatch(batch: Omit<PendingBatch, 'id'>) {
  try {
    const id = await db.pendingBatches.add(batch);
    return id;
  } catch (error) {
    console.error("Failed to save pending batch offline:", error);
    throw error;
  }
}

export async function getPendingBatches() {
  return await db.pendingBatches.orderBy('timestamp').toArray();
}

export async function removePendingBatch(id: number) {
  return await db.pendingBatches.delete(id);
}
