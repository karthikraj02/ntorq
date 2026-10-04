import type { UserDTO } from '@shared/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistOptions } from './storage';

interface AuthState {
  /** The signed-in account. Tokens are kept separately in the secure keychain. */
  user: UserDTO | null;
  /** True after the server rejected the saved session; cleared on the next sign-in. */
  sessionExpired: boolean;
  signIn: (user: UserDTO) => void;
  signOut: () => void;
  expireSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      sessionExpired: false,
      signIn: user => set({ user, sessionExpired: false }),
      signOut: () => set({ user: null, sessionExpired: false }),
      expireSession: () => set({ user: null, sessionExpired: true }),
    }),
    persistOptions('auth'),
  ),
);
