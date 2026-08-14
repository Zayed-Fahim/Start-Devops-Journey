'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useId, useState } from 'react';
import { ApiError, savePreferences } from '@/lib/api-browser';
import { browserTimezone, formatDateTime, formatZoneLabel } from '@/lib/datetime';
import type { SessionUser, TimeFormat } from '@/lib/types';
import { Select } from './Select';

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
  const [country, setCountry] = useState(user.country ?? '');
  const [timezone, setTimezone] = useState(user.timezone ?? browserTimezone());
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(user.timeFormat ?? 'H24');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const preview = { timezone, timeFormat };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await savePreferences({ country: country || null, timezone: timezone || null, timeFormat });
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save your preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface-raised px-4 py-2">
        <h2 className="text-headline-md">Display</h2>
        <p className="text-label-sm text-fg-muted">
          Every date and time in the dashboard is shown in this zone and format.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 p-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-body-sm text-danger"
          >
            {error}
          </div>
        )}
        {saved && !error && (
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
            <Select
              id={`${uid}-country`}
              value={country}
              onChange={setCountry}
              label="Country"
              options={COUNTRIES}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-timezone`} className="block text-label-md">
              Timezone
            </label>
            <Select
              id={`${uid}-timezone`}
              value={timezone}
              onChange={setTimezone}
              label="Timezone"
              options={zoneOptions(user.timezone)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-format`} className="block text-label-md">
              Time format
            </label>
            <Select
              id={`${uid}-format`}
              value={timeFormat}
              onChange={(next) => setTimeFormat(next as TimeFormat)}
              label="Time format"
              options={[
                { value: 'H24', label: '24 hour (14:30)' },
                { value: 'H12', label: '12 hour (2:30 PM)' },
              ]}
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
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-label-md text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
    </section>
  );
}
