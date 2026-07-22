import path from 'path';
import type { NextConfig } from 'next';

const repoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['mathml2omml', 'pptxgenjs', '@openmaic/importer', '@openmaic/dsl', '@openmaic/renderer'],
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  serverExternalPackages: ['@earendil-works/pi-ai', '@earendil-works/pi-agent-core'],
};

export default nextConfig;
