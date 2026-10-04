import React from 'react';
import { todayIso } from '@/utils/dates';
import { Button } from './Button';
import { Row, Stack } from './Row';
import { TextField } from './TextField';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

/** Date input in YYYY-MM-DD form with a "Today" shortcut (no native date picker dependency). */
export function DateField({ label, value, onChange, error }: Props) {
  return (
    <Stack gap="xs">
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={error}
        maxLength={10}
      />
      <Row>
        <Button
          small
          variant="ghost"
          label="Today"
          onPress={() => onChange(todayIso())}
        />
      </Row>
    </Stack>
  );
}
