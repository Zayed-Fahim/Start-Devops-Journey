'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { savePreferences } from '@/lib/api-browser';
import { browserTimezone, formatDateTime, formatZoneLabel } from '@/lib/datetime';
import { applyServerErrors } from '@/lib/form-errors';
import type { SessionUser, TimeFormat } from '@/lib/types';
import { Select } from './Select';

interface PreferenceValues {
  country: string;
  timezone: string;
  timeFormat: TimeFormat;
}

const COUNTRIES = [
  { value: '', label: 'Not set' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'IN', label: 'India' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'JP', label: 'Japan' },
  { value: 'AE', label: 'United Arab Emirates' },
];

const zoneOptions = (current: string | null) => {
  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : ['UTC', 'Asia/Dhaka', 'Europe/London', 'America/New_York'];
  const zones = new Set<string>([browserTimezone(), ...supported]);
  if (current) zones.add(current);
  return [...zones].sort().map((zone) => ({ value: zone, label: zone }));
};

export function PreferencesCard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const uid = useId();
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PreferenceValues>({
    defaultValues: {
      country: user.country ?? '',
      timezone: user.timezone ?? browserTimezone(),
      timeFormat: user.timeFormat ?? 'H24',
    },
  });

  const preview = {
    timezone: useWatch({ control, name: 'timezone' }),
    timeFormat: useWatch({ control, name: 'timeFormat' }),
  };

  const submit = handleSubmit(async (values) => {
    setSaved(false);
    try {
      await savePreferences({
        country: values.country || null,
        timezone: values.timezone || null,
        timeFormat: values.timeFormat,
      });
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (error) {
      applyServerErrors(error, setError, ['country', 'timezone', 'timeFormat']);
    }
  });

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface-raised px-4 py-2">
        <h2 className="text-headline-md">Display</h2>
        <p className="text-label-sm text-fg-muted">
          Every date and time in the dashboard is shown in this zone and format.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 p-4" noValidate>
        {errors.root && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-body-sm text-danger"
          >
            {errors.root.message}
          </div>
        )}
        {saved && !errors.root && (
          <div
            role="status"
            className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-body-sm text-success"
          >
            Saved.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-country`} className="block text-label-md">
              Country
            </label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Select
                  id={`${uid}-country`}
                  value={field.value}
                  onChange={field.onChange}
                  label="Country"
                  options={COUNTRIES}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-timezone`} className="block text-label-md">
              Timezone
            </label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select
                  id={`${uid}-timezone`}
                  value={field.value}
                  onChange={field.onChange}
                  label="Timezone"
                  options={zoneOptions(user.timezone)}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-format`} className="block text-label-md">
              Time format
            </label>
            <Controller
              control={control}
              name="timeFormat"
              render={({ field }) => (
                <Select
                  id={`${uid}-format`}
                  value={field.value}
                  onChange={(next) => field.onChange(next as TimeFormat)}
                  label="Time format"
                  options={[
                    { value: 'H24', label: '24 hour (14:30)' },
                    { value: 'H12', label: '12 hour (2:30 PM)' },
                  ]}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-label-md">Preview</span>
            <p className="flex h-10 items-center rounded-lg border border-border bg-bg px-3 font-mono text-body-sm text-fg-muted">
              {formatDateTime(new Date(), preview)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label-sm text-fg-muted">{formatZoneLabel(preview)}</p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-accent px-4 py-2 text-label-md text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
    </section>
  );
}
