import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

export interface PasswordService {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  /** Burns the same time as a real check, so unknown emails are not detectable by timing. */
  verifyDummy(password: string): Promise<void>;
}

// Cheap parameters keep the test suite fast; production uses argon2 defaults.
const TEST_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 1024,
  timeCost: 1,
  parallelism: 1,
} as const;

const PRODUCTION_OPTIONS = { type: argon2.argon2id } as const;

export function createPasswordService(
  useFastParameters: boolean,
): PasswordService {
  const options = useFastParameters ? TEST_OPTIONS : PRODUCTION_OPTIONS;
  let dummyHash: Promise<string> | undefined;

  return {
    hash: (password) => argon2.hash(password, options),
    async verify(hash, password) {
      try {
        return await argon2.verify(hash, password);
      } catch {
        return false;
      }
    },
    async verifyDummy(password) {
      dummyHash ??= argon2.hash(randomBytes(16).toString('hex'), options);
      await argon2.verify(await dummyHash, password).catch(() => false);
    },
  };
}
