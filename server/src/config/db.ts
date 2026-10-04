import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/** Connects to MongoDB. Errors are rethrown without the connection string. */
export async function connectDatabase(uri: string): Promise<void> {
  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected'),
  );
  mongoose.connection.on('reconnected', () =>
    logger.info('MongoDB reconnected'),
  );
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  } catch (error) {
    const reason = error instanceof Error ? error.name : 'UnknownError';
    throw new Error(
      `Could not connect to MongoDB (${reason}). Check MONGODB_URI and that the database is reachable.`,
      { cause: error },
    );
  }
  logger.info('MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
