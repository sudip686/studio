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
};

export default nextConfig;
