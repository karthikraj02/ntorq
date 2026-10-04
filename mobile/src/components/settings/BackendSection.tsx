import axios from 'axios';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Layout';
import { Banner } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { toApiFailure } from '@/services/api/errors';
import { normalizeBackendUrl, useSettingsStore } from '@/store/settingsStore';

type Result = { tone: 'ok' | 'warn' | 'danger'; message: string };

export function BackendSection() {
  const backendUrl = useSettingsStore(state => state.backendUrl);
  const setBackendUrl = useSettingsStore(state => state.setBackendUrl);
  const [text, setText] = useState(backendUrl);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const saveAndTest = async () => {
    const normalized = normalizeBackendUrl(text);
    if (normalized.error !== null) {
      setResult({ tone: 'danger', message: normalized.error });
      return;
    }
    setBackendUrl(normalized.url);
    setText(normalized.url);
    setBusy(true);
    try {
      const response = await axios.get<{ status: string; database: string }>(
        `${normalized.url}/api/health`,
        { timeout: 8000 },
      );
      const databaseUp = response.data.database === 'up';
      setResult(
        databaseUp
          ? {
              tone: 'ok',
              message: 'Connected. The server and its database are running.',
            }
          : {
              tone: 'warn',
              message:
                'The server answered, but its database is not available.',
            },
      );
    } catch (error) {
      setResult({ tone: 'danger', message: toApiFailure(error).userMessage });
    } finally {
      setBusy(false);
    }
  };

  const insecure =
    /^http:\/\//i.test(text.trim()) &&
    !/^http:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.)/i.test(text.trim());

  return (
    <>
      <SectionHeader title="BACKEND" />
      <Card>
        <TextField
          label="Server address"
          value={text}
          onChangeText={value => {
            setText(value);
            setResult(null);
          }}
          autoCapitalize="none"
          keyboardType="url"
          helper="The app works fully offline. A server is only needed to back up and sync your data."
        />
        {insecure ? (
          <Banner
            tone="warn"
            message="This address uses plain HTTP over the internet. Use HTTPS; release builds of the app block plain HTTP."
          />
        ) : null}
        {result ? <Banner tone={result.tone} message={result.message} /> : null}
        <Button
          label="Save and test connection"
          variant="secondary"
          loading={busy}
          onPress={saveAndTest}
          fill
        />
      </Card>
    </>
  );
}
