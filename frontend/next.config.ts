import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * STANDALONE OUTPUT — the single biggest win for the production image.
   *
   * `next build` normally leaves you needing the whole node_modules tree at
   * runtime (~400 MB for this app). With `standalone`, Next traces which files
   * are ACTUALLY reachable from the server entrypoint and copies just those
   * into .next/standalone, together with a self-contained server.js. The
   * result is typically 30-60 MB, and it needs no `yarn install` and no
   * package manager in the final image.
   *
   * ⚠ THIS CHANGES HOW THE APP IS STARTED. `next start` (i.e. `yarn start`)
   * is NOT supported with standalone output — Next 15 prints
   *
   *     ⚠ "next start" does not work with "output: standalone" configuration.
   *       Use "node .next/standalone/server.js" instead.
   *
   * The current frontend/Dockerfile.prod ends with `CMD ["yarn", "start"]`,
   * so it must change. The runtime stage copies these three things instead of
   * node_modules + .next:
   *
   *     COPY --from=builder /usr/app/.next/standalone ./
   *     COPY --from=builder /usr/app/.next/static ./.next/static
   *     COPY --from=builder /usr/app/public ./public
   *     CMD ["node", "server.js"]
   *
   * Note the two extra copies: static assets and public/ are deliberately NOT
   * traced into standalone, because they are files to be served rather than
   * files that are imported. Miss them and the app boots fine but every page
   * loads unstyled with no JavaScript — a confusing failure that looks like a
   * CSS bug rather than a missing COPY.
   *
   * (Editing the Dockerfile is your call — this config just makes the option
   * available.)
   */
  output: "standalone",

  // Fail the production build if a type error slipped through, rather than
  // shipping it. These are the defaults; stated explicitly so nobody
  // "temporarily" flips them to true to get a deploy out and forgets.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
