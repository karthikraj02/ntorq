import { DEFAULT_SERVICE_THRESHOLDS } from '@shared/constants';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Layout';
import { Row, Stack } from '@/components/ui/Row';
import { Banner } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useSettingsStore } from '@/store/settingsStore';
import { parseOptionalNumber } from '@/utils/parse';

type Field = 'dueSoonKm' | 'dueSoonDays' | 'overdueKm' | 'overdueDays';

const FIELDS: { key: Field; label: string; suffix: string }[] = [
  {
    key: 'dueSoonKm',
    label: 'Show "due soon" when this close (distance)',
    suffix: 'km',
  },
  {
    key: 'dueSoonDays',
    label: 'Show "due soon" when this close (time)',
    suffix: 'days',
  },
  {
    key: 'overdueKm',
    label: 'Show "overdue" when this far past due (distance)',
    suffix: 'km',
  },
  {
    key: 'overdueDays',
    label: 'Show "overdue" when this far past due (time)',
    suffix: 'days',
  },
];

export function ThresholdsSection() {
  const thresholds = useSettingsStore(state => state.serviceThresholds);
  const setThresholds = useSettingsStore(state => state.setServiceThresholds);
  const [text, setText] = useState<Record<Field, string>>({
    dueSoonKm: String(thresholds.dueSoonKm),
    dueSoonDays: String(thresholds.dueSoonDays),
    overdueKm: String(thresholds.overdueKm),
    overdueDays: String(thresholds.overdueDays),
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saved, setSaved] = useState(false);

  const save = () => {
    const nextErrors: Partial<Record<Field, string>> = {};
    const next = { ...thresholds };
    for (const { key, label } of FIELDS) {
      const parsed = parseOptionalNumber(text[key], {
        label,
        min: 0,
        max: 100_000,
        integer: true,
      });
      if (parsed.error || parsed.value === null)
        nextErrors[key] = parsed.error ?? 'Enter a number.';
      else next[key] = parsed.value;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setThresholds(next);
      setSaved(true);
    }
  };

  const reset = () => {
    setText({
      dueSoonKm: String(DEFAULT_SERVICE_THRESHOLDS.dueSoonKm),
      dueSoonDays: String(DEFAULT_SERVICE_THRESHOLDS.dueSoonDays),
      overdueKm: String(DEFAULT_SERVICE_THRESHOLDS.overdueKm),
      overdueDays: String(DEFAULT_SERVICE_THRESHOLDS.overdueDays),
    });
    setThresholds({ ...DEFAULT_SERVICE_THRESHOLDS });
    setErrors({});
    setSaved(true);
  };

  return (
    <>
      <SectionHeader title="SERVICE REMINDERS" />
      <Card>
        {FIELDS.map(({ key, label, suffix }) => (
          <TextField
            key={key}
            label={label}
            value={text[key]}
            onChangeText={value => {
              setSaved(false);
              setText(current => ({ ...current, [key]: value }));
            }}
            keyboardType="numeric"
            suffix={suffix}
            error={errors[key]}
          />
        ))}
        {saved ? <Banner tone="ok" message="Saved." /> : null}
        <Row gap="md">
          <Stack fill>
            <Button fill label="Save" onPress={save} />
          </Stack>
          <Stack fill>
            <Button fill variant="secondary" label="Defaults" onPress={reset} />
          </Stack>
        </Row>
      </Card>
    </>
  );
}
