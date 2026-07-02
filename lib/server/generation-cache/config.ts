import path from 'path';

export function isGenerationCacheEnabled(): boolean {
  return process.env.GENERATION_CACHE_ENABLED !== 'false';
}

export function getGenerationCacheJsonDir(): string {
  return (
    process.env.GENERATION_CACHE_JSON_DIR?.trim() ||
    path.join(process.cwd(), 'data', 'generation-cache')
  );
}

export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url || undefined;
}
