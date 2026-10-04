import { useCallback, useState } from 'react';

/** Minimal form state: values keyed by field, plus a setter factory for inputs. */
export function useForm<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const setField = useCallback(
    <K extends keyof T>(field: K) =>
      (value: T[K]) =>
        setValues(current => ({ ...current, [field]: value })),
    [],
  );
  return { values, setField, setValues };
}
