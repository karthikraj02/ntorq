import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

let mongo: MongoMemoryServer | undefined;

/** Starts one in-memory MongoDB for the whole run; each test file uses its own database. */
export default async function setup(project: TestProject) {
  mongo = await MongoMemoryServer.create();
  project.provide('mongoUri', mongo.getUri());
  return async () => {
    await mongo?.stop();
  };
}
