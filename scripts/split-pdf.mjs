#!/usr/bin/env node
/**
 * Extract page ranges from a PDF into one or more output files.
 *
 * Usage:
 *   node scripts/split-pdf.mjs input.pdf --start 3 --end 7
 *   node scripts/split-pdf.mjs input.pdf --start 3 --end 7 --out chapter-2.pdf
 *   node scripts/split-pdf.mjs input.pdf --ranges 1-5,10-15,20-25
 *
 * Page numbers are 1-based and inclusive.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

function printUsage() {
  console.error(`Usage:
  node scripts/split-pdf.mjs <input.pdf> --start <n> [--end <n>] [--out <file.pdf>]
  node scripts/split-pdf.mjs <input.pdf> --ranges <start-end>[,<start-end>...] [--out-dir <dir>]

Options:
  --start, -s     First page to include (1-based)
  --end, -e       Last page to include (1-based). Defaults to --start (single page).
  --ranges, -r    Comma-separated ranges, e.g. 1-5,10-15
  --out, -o       Output file path (single range only)
  --out-dir       Output directory for --ranges (default: same as input)
  --help, -h      Show this help`);
}

function parseArgs(argv) {
  const options = {
    input: undefined,
    ranges: [],
    out: undefined,
    outDir: undefined,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--start' || arg === '-s') {
      const start = Number(argv[++i]);
      let end = start;
      const next = argv[i + 1];
      if (next === '--end' || next === '-e') {
        end = Number(argv[i + 2]);
        i += 2;
      } else if (next !== undefined && !next.startsWith('-')) {
        // allow: --start 3 7
        end = Number(argv[++i]);
      }
      options.ranges.push({ start, end });
    } else if (arg === '--end' || arg === '-e') {
      if (options.ranges.length === 0) {
        throw new Error('--end requires --start');
      }
      options.ranges[options.ranges.length - 1].end = Number(argv[++i]);
    } else if (arg === '--ranges' || arg === '-r') {
      const raw = argv[++i];
      if (!raw) throw new Error('Missing value for --ranges');
      for (const part of raw.split(',')) {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) {
          throw new Error(`Invalid range "${trimmed}". Use start-end, e.g. 1-5`);
        }
        options.ranges.push({
          start: Number(match[1]),
          end: Number(match[2]),
        });
      }
    } else if (arg === '--out' || arg === '-o') {
      options.out = path.resolve(argv[++i]);
    } else if (arg === '--out-dir') {
      options.outDir = path.resolve(argv[++i]);
    } else if (!arg.startsWith('-') && !options.input) {
      options.input = path.resolve(arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function validateRange({ start, end }, pageCount) {
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error('Page numbers must be integers');
  }
  if (start < 1 || end < 1) {
    throw new Error('Page numbers must be >= 1');
  }
  if (start > end) {
    throw new Error(`Invalid range ${start}-${end}: start must be <= end`);
  }
  if (end > pageCount) {
    throw new Error(`Range ${start}-${end} exceeds document length (${pageCount} pages)`);
  }
}

function defaultOutputPath(inputPath, start, end, outDir) {
  const base = path.basename(inputPath, path.extname(inputPath));
  const filename = `${base}-pages-${start}-${end}.pdf`;
  return path.join(outDir ?? path.dirname(inputPath), filename);
}

async function extractRange(sourceDoc, { start, end }) {
  const outDoc = await PDFDocument.create();
  const pageIndexes = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  const copiedPages = await outDoc.copyPages(sourceDoc, pageIndexes);
  for (const page of copiedPages) {
    outDoc.addPage(page);
  }
  return outDoc.save();
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    printUsage();
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!options.input) {
    console.error('Missing input PDF path.');
    printUsage();
    process.exit(1);
  }

  if (options.ranges.length === 0) {
    console.error('Specify --start or --ranges.');
    printUsage();
    process.exit(1);
  }

  if (options.ranges.length > 1 && options.out) {
    console.error('--out can only be used with a single range. Use --out-dir instead.');
    process.exit(1);
  }

  try {
    await fs.access(options.input);
  } catch {
    console.error(`File not found: ${options.input}`);
    process.exit(1);
  }

  const inputBytes = await fs.readFile(options.input);
  const sourceDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
  const pageCount = sourceDoc.getPageCount();

  for (const range of options.ranges) {
    validateRange(range, pageCount);
  }

  if (options.outDir) {
    await fs.mkdir(options.outDir, { recursive: true });
  }

  for (const range of options.ranges) {
    const { start, end } = range;
    const outputPath =
      options.out ?? defaultOutputPath(options.input, start, end, options.outDir);

    const pdfBytes = await extractRange(sourceDoc, range);
    await fs.writeFile(outputPath, pdfBytes);

    const pageLabel = start === end ? `page ${start}` : `pages ${start}-${end}`;
    console.log(`Wrote ${pageLabel} -> ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
