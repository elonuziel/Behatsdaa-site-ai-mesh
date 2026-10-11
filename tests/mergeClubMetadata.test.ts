import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// The ingestion script executes on import. Mock its filesystem boundary so the
// real pipeline runs against tiny fixtures without rewriting repository data.
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    copyFileSync: vi.fn(),
  },
}));

const dataDir = fileURLToPath(new URL('../data/', import.meta.url));
const sourceDir = path.join(dataDir, 'sources');
const uniqPath = path.join(sourceDir, 'uniq', 'rechargeable_benefits.json');
const fallbackTimestamp = '2026-10-11T09:47:04Z';
let files: Map<string, string>;

describe('UNIQ metadata in merged club catalogs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    files = new Map([
      [
        path.join(sourceDir, 'behatsdaa', 'stores.json'),
        JSON.stringify({ stores: [], metadata: { last_updated: '2026-09-01T01:00:00Z' } }),
      ],
      [path.join(sourceDir, 'behatsdaa', 'deals.json'), JSON.stringify({ deals: [] })],
      [
        path.join(sourceDir, 'mastercard', 'deals.json'),
        JSON.stringify({ deals: [], metadata: { last_updated: '2026-09-02T02:00:00Z' } }),
      ],
    ]);
    vi.mocked(fs.existsSync).mockImplementation(
      (file) => String(file) === path.join(sourceDir, 'behatsdaa') || files.has(String(file))
    );
    vi.mocked(fs.readFileSync).mockImplementation((file) => {
      const contents = files.get(String(file));
      if (contents === undefined) throw new Error(`Unexpected fixture read: ${file}`);
      return contents;
    });
    vi.mocked(fs.writeFileSync).mockImplementation((file, contents) => {
      files.set(String(file), String(contents));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    {
      name: 'source timestamp',
      source: { metadata: { last_updated: '2026-08-15T12:34:56Z' }, brands: [] },
      expected: '2026-08-15T12:34:56Z',
    },
    { name: 'missing source file', source: undefined, expected: fallbackTimestamp },
    { name: 'missing metadata', source: { brands: [] }, expected: fallbackTimestamp },
    {
      name: 'missing timestamp',
      source: { metadata: {}, brands: [] },
      expected: fallbackTimestamp,
    },
    {
      name: 'empty timestamp',
      source: { metadata: { last_updated: '' }, brands: [] },
      expected: fallbackTimestamp,
    },
  ])('writes both catalogs with $name', async ({ source, expected }) => {
    if (source !== undefined) files.set(uniqPath, JSON.stringify(source));

    // Regression: uniqRec used to be block-scoped, so writing metadata threw
    // ReferenceError whether or not the rechargeable benefits file existed.
    await import('../scripts/merge_all_clubs.js');

    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    for (const catalog of ['stores', 'deals']) {
      const output = JSON.parse(files.get(path.join(dataDir, `${catalog}.json`))!);
      expect(output.metadata.clubs_last_updated).toEqual({
        behatsdaa: '2026-09-01T01:00:00Z',
        uniq: expected,
        mastercard: '2026-09-02T02:00:00Z',
      });
      expect(output[catalog]).toEqual([]);
    }
  });

  it('preserves rechargeable brands while sharing their source metadata', async () => {
    files.set(
      uniqPath,
      JSON.stringify({
        metadata: { last_updated: '2026-08-15T12:34:56Z' },
        brands: [{ id: 'example', name: 'Example Brand', discount: '17%' }],
      })
    );

    await import('../scripts/merge_all_clubs.js');

    const stores = JSON.parse(files.get(path.join(dataDir, 'stores.json'))!);
    const deals = JSON.parse(files.get(path.join(dataDir, 'deals.json'))!);
    expect(stores.metadata.clubs_last_updated.uniq).toBe('2026-08-15T12:34:56Z');
    expect(deals.metadata.clubs_last_updated.uniq).toBe('2026-08-15T12:34:56Z');
    expect(stores.stores).toHaveLength(1);
    expect(stores.stores[0]).toMatchObject({
      id: 'uniq-example',
      name: 'Example Brand',
      clubs: ['uniq'],
      payment_options: [expect.objectContaining({ club: 'uniq', rate: 17, type: 'loaded_card' })],
    });
  });
});
