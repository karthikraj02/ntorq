import React, { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Layout';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Banner } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/services/api';
import { toApiFailure } from '@/services/api/errors';
import { syncService } from '@/services/sync';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { formatDateTime } from '@/utils/dates';

type Mode = 'login' | 'register';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SyncPanel() {
  const { queue, lastSyncAt, status, lastError } = useSyncStore();
  const [busy, setBusy] = useState(false);

  const syncNow = async () => {
    setBusy(true);
    try {
      await syncService.syncNow();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionHeader title="SYNC" />
      <Card>
        <AppText>
          {queue.length === 0
            ? 'Everything is backed up.'
            : `${queue.length} change${
                queue.length === 1 ? '' : 's'
              } waiting to upload.`}
        </AppText>
        <AppText variant="caption" tone="dim">
          Last sync: {formatDateTime(lastSyncAt)}
        </AppText>
        {lastError ? <Banner tone="warn" message={lastError} /> : null}
        <Button
          label="Sync now"
          loading={busy || status === 'syncing'}
          onPress={syncNow}
          fill
        />
        <AppText variant="caption" tone="faint">
          Your data always stays on this phone first. Syncing sends a copy to
          your server when it is reachable.
        </AppText>
      </Card>
    </>
  );
}

export function AccountScreen() {
  const user = useAuthStore(state => state.user);
  const sessionExpired = useAuthStore(state => state.sessionExpired);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL.test(trimmedEmail))
      return setError('Enter a valid email address.');
    if (mode === 'register' && password.length < 10)
      return setError('Choose a password of at least 10 characters.');
    if (mode === 'register' && displayName.trim() === '')
      return setError('Enter your name.');
    if (mode === 'login' && password === '')
      return setError('Enter your password.');

    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await authApi.register({
          email: trimmedEmail,
          password,
          displayName: displayName.trim(),
        });
      } else {
        await authApi.login({ email: trimmedEmail, password });
      }
      setPassword('');
      syncService.syncNow().catch(() => undefined);
    } catch (failure) {
      setError(toApiFailure(failure).userMessage);
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <Screen>
        <Card>
          <AppText variant="label" tone="dim">
            SIGNED IN AS
          </AppText>
          <AppText variant="title">{user.displayName}</AppText>
          <AppText tone="dim">{user.email}</AppText>
        </Card>
        <SyncPanel />
        <Button
          variant="danger"
          label="Sign out"
          onPress={() => authApi.logout()}
          fill
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {sessionExpired ? (
        <Banner
          tone="warn"
          message="Your session has expired. Please sign in again."
        />
      ) : null}
      <Banner
        tone="info"
        message="An account is optional. The app works fully offline; signing in only lets it back up and sync your data."
      />
      <SegmentedControl
        value={mode}
        onChange={value => {
          setMode(value);
          setError(null);
        }}
        options={[
          { value: 'login', label: 'Sign in' },
          { value: 'register', label: 'Create account' },
        ]}
      />
      {mode === 'register' ? (
        <TextField
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />
      ) : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        helper={mode === 'register' ? 'At least 10 characters.' : undefined}
      />
      {error ? <Banner tone="danger" message={error} /> : null}
      <View>
        <Button
          label={mode === 'login' ? 'Sign in' : 'Create account'}
          loading={busy}
          onPress={submit}
          fill
        />
      </View>
    </Screen>
  );
}
