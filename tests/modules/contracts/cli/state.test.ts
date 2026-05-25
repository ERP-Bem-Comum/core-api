import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isErr, isOk } from '#src/shared/index.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { loadState, saveState } from '#src/modules/contracts/cli/state.ts';

let tempDir: string;

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'state-test-'));
});

after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('loadState — Defeito #12 (I/O boundary → Result)', () => {
  it('returns Ok for non-existent file (initial run)', () => {
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(
      join(tempDir, 'nonexistent.json'),
      contractRepo,
      amendmentRepo,
      documentRepo,
    );
    assert.equal(isOk(r), true);
  });

  it('returns Ok for empty file', () => {
    const path = join(tempDir, 'empty.json');
    writeFileSync(path, '', 'utf-8');
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isOk(r), true);
  });

  it('returns Err state-file-corrupted for invalid JSON', () => {
    const path = join(tempDir, 'corrupted.json');
    writeFileSync(path, 'invalid {{{ json', 'utf-8');
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-file-corrupted');
  });

  it('returns Err state-schema-invalid when contracts is not array', () => {
    const path = join(tempDir, 'wrong-schema.json');
    writeFileSync(path, JSON.stringify({ contracts: 'oops', amendments: [] }), 'utf-8');
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-schema-invalid');
  });

  it('returns Err state-schema-invalid when amendments is not array', () => {
    const path = join(tempDir, 'wrong-schema-2.json');
    writeFileSync(path, JSON.stringify({ contracts: [], amendments: { broken: true } }), 'utf-8');
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-schema-invalid');
  });

  it('returns Err state-file-not-readable when path is a directory', () => {
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(tempDir, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-file-not-readable');
  });

  it('returns Ok and loads contracts from valid snapshot', () => {
    const path = join(tempDir, 'valid.json');
    writeFileSync(path, JSON.stringify({ contracts: [], amendments: [] }), 'utf-8');
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = loadState(path, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isOk(r), true);
  });
});

describe('saveState — Defeito #12 (I/O boundary → Result)', () => {
  it('returns Ok when path is writable', () => {
    const path = join(tempDir, 'output.json');
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = saveState(path, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isOk(r), true);
  });

  it('returns Err state-file-not-writable when parent dir does not exist', () => {
    const path = join(tempDir, 'no-such-dir', 'output.json');
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = saveState(path, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-file-not-writable');
  });

  it('returns Err state-file-not-writable when path is a directory', () => {
    const contractRepo = InMemoryContractRepository();
    const amendmentRepo = InMemoryAmendmentRepository();
    const documentRepo = InMemoryDocumentRepository();
    const r = saveState(tempDir, contractRepo, amendmentRepo, documentRepo);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'state-file-not-writable');
  });
});
