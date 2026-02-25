import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, Select } from '@inkjs/ui';
import type { FormFieldDef } from '../../state.js';

interface FormDialogProps {
  title: string;
  fields: FormFieldDef[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function FormDialog({ fields, onSubmit, onCancel }: FormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const f of fields) {
      defaults[f.name] = f.defaultValue ?? '';
    }
    return defaults;
  });
  const [activeField, setActiveField] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const current = fields[activeField];
  const isLast = activeField === fields.length - 1;

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      // Tab to move between fields when on a select
      if (key.tab && current?.type === 'select') {
        if (isLast) {
          setSubmitted(true);
          onSubmit(values);
        } else {
          setActiveField((i) => i + 1);
        }
      }
    },
    { isActive: !submitted }
  );

  if (!current) return null;

  return (
    <Box flexDirection="column" gap={1}>
      {/* Show completed fields */}
      {fields.slice(0, activeField).map((f) => (
        <Box key={f.name} gap={1}>
          <Text dimColor>{f.label}:</Text>
          <Text>{values[f.name]}</Text>
        </Box>
      ))}

      {/* Active field */}
      <Box flexDirection="column">
        <Text bold>{current.label}{current.required ? ' *' : ''}</Text>
        {current.type === 'text' ? (
          <TextInput
            placeholder={current.placeholder ?? ''}
            defaultValue={values[current.name]}
            onSubmit={(value) => {
              const newValues = { ...values, [current.name]: value };
              setValues(newValues);
              if (isLast) {
                setSubmitted(true);
                onSubmit(newValues);
              } else {
                setActiveField((i) => i + 1);
              }
            }}
          />
        ) : (
          <Select
            options={(current.options ?? []).map((o) => ({
              label: o.label,
              value: o.value,
            }))}
            onChange={(value) => {
              const newValues = { ...values, [current.name]: value };
              setValues(newValues);
              if (isLast) {
                setSubmitted(true);
                onSubmit(newValues);
              } else {
                setActiveField((i) => i + 1);
              }
            }}
          />
        )}
      </Box>

      <Text dimColor>Esc to cancel{current.type === 'text' ? ', Enter to continue' : ''}</Text>
    </Box>
  );
}
