import type {NextConfig} from 'next';
import {execFileSync} from 'node:child_process';

const buildRevision = process.env.VERCEL_GIT_COMMIT_SHA
  ?? process.env.CF_PAGES_COMMIT_SHA
  ?? process.env.GITHUB_SHA
  ?? (() => {
    try {
      return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      return 'unavailable';
    }
  })();
const hasTrackedWorkingChanges = (() => {
  try {
    return execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().length > 0;
  } catch {
    return false;
  }
})();
const buildTarget = process.env.TANGA_BUILD_TARGET
  ?? (process.env.VERCEL
    ? `Vercel · ${process.env.VERCEL_ENV ?? 'deployment'}`
    : process.env.CF_PAGES
      ? 'Cloudflare Pages'
      : 'Local Next.js');

const nextConfig: NextConfig = {
  // Keep the live desktop preview separate from Next/OpenNext release builds.
  // A separate output is useful for build verification while the active local
  // preview is serving the default .next tree.
  distDir: process.env.TANGA_NEXT_DIST_DIR?.trim()
    || (process.env.NODE_ENV === 'development' ? '.next-local' : '.next'),
  env: {
    NEXT_PUBLIC_PRESENTATION_BUILD_REVISION: `${buildRevision.slice(0, 12)}${hasTrackedWorkingChanges ? '+dirty' : ''}`,
    NEXT_PUBLIC_PRESENTATION_BUILD_TARGET: buildTarget,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // The filename is versioned and the build verifier checks its
        // source count and encoded length, so this payload is immutable.
        // Long-lived browser caching avoids a repeat transfer on new visits.
        source: '/resource_blocks_v1.bin',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
