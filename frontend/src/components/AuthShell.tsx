'use client';

import Link from 'next/link';
import { ChevronLeftIcon, Grid2x2PlusIcon } from 'lucide-react';
import { Button } from './ui/button';

/**
 * The travel is CSS, not framer-motion, and that is a deliberate correction.
 *
 * framer-motion implements pathLength/pathOffset by rewriting three SVG
 * attributes per path per frame. At 36 paths x 2 fans that measured 46,656
 * attribute writes in 3 seconds (~15.5k/s each for pathLength, stroke-dasharray
 * and stroke-dashoffset), which the main thread cannot repaint on a full-height
 * panel — the visible result was a flickering background.
 *
 * The same effect as a CSS keyframe costs zero DOM writes per frame: the dash
 * geometry is set once as static attributes and the browser interpolates
 * stroke-dashoffset itself. Per-path duration is derived from the index rather
 * than Math.random() so the server and client markup agree.
 */
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    duration: 20 + ((i * 7) % 10) + (position > 0 ? 0 : 3),
    delay: -((i * 3) % 20),
  }));

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-slate-950 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            pathLength={1}
            className="auth-path"
            style={{
              animationDuration: `${path.duration}s`,
              animationDelay: `${path.delay}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative bg-bg text-fg md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col border-r border-border bg-surface/60 p-10 lg:flex">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-bg to-transparent" />
        <div className="z-10 flex items-center gap-2">
          <Grid2x2PlusIcon className="size-6" />
          <p className="text-xl font-semibold">Admin Panel</p>
        </div>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;Every role, every permission and every session in one place — and an audit
              trail that explains how it got that way.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold">~ User Management Dashboard</footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col justify-center p-4">
        <div aria-hidden className="absolute inset-0 isolate -z-10 opacity-60 contain-strict">
          <div className="absolute right-0 top-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,color-mix(in_srgb,var(--fg)_6%,transparent)_0,hsla(0,0%,55%,.02)_50%,color-mix(in_srgb,var(--fg)_1%,transparent)_80%)]" />
          <div className="absolute right-0 top-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--fg)_4%,transparent)_0,color-mix(in_srgb,var(--fg)_1%,transparent)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute right-0 top-0 h-320 w-60 -translate-y-87.5 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--fg)_4%,transparent)_0,color-mix(in_srgb,var(--fg)_1%,transparent)_80%,transparent_100%)]" />
        </div>

        <Button variant="ghost" className="absolute left-5 top-7" asChild>
          <Link href="/">
            <ChevronLeftIcon className="me-2 size-4" />
            Home
          </Link>
        </Button>

        <div className="mx-auto space-y-4 sm:w-sm">
          <div className="flex items-center gap-2 lg:hidden">
            <Grid2x2PlusIcon className="size-6" />
            <p className="text-xl font-semibold">Admin Panel</p>
          </div>
          <div className="flex flex-col space-y-1">
            <h1 className="text-2xl font-bold tracking-wide">{title}</h1>
            <p className="text-base text-fg-muted">{description}</p>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
