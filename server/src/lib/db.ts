import mongoose from 'mongoose';

let isReplicaSet = false;
export const supportsTransactions = () => isReplicaSet;

export async function connectDB(uri: string) {
  await mongoose.connect(uri);
  // Detect replica set so order creation can pick transaction vs manual-cleanup path (review #5)
  try {
    const admin = mongoose.connection.db!.admin();
    const status = await admin.command({ hello: 1 });
    isReplicaSet = Boolean(status.setName);
  } catch {
    isReplicaSet = false;
  }
  console.log(
    `MongoDB connected. Transactions: ${isReplicaSet ? 'enabled (replica set)' : 'DISABLED (standalone) — using manual cleanup'}`
  );
}
