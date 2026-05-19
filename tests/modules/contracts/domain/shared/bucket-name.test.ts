import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { BucketName } from '#src/modules/contracts/domain/shared/bucket-name.ts';

// Regras canônicas vêm da doc AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
// Cada teste mapeia para um critério de aceite do 000-request.md.

describe('BucketName — happy path', () => {
  it('accepts a typical lowercase name with hyphens', () => {
    const r = BucketName.create('contracts-documents');
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, 'contracts-documents');
  });

  it('accepts the minimum length of 3 characters', () => {
    const r = BucketName.create('abc');
    assert.equal(isOk(r), true);
  });

  it('accepts the maximum length of 63 characters', () => {
    const r = BucketName.create('a'.repeat(63));
    assert.equal(isOk(r), true);
  });

  it('accepts digits at both ends', () => {
    const r = BucketName.create('1bucket9');
    assert.equal(isOk(r), true);
  });

  it('accepts names with single dots (FQDN-like)', () => {
    const r = BucketName.create('contracts.documents.prod');
    assert.equal(isOk(r), true);
  });
});

describe('BucketName — length rules', () => {
  it('rejects names shorter than 3 chars', () => {
    const r = BucketName.create('ab');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-too-short');
  });

  it('rejects empty string as too short', () => {
    const r = BucketName.create('');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-too-short');
  });

  it('rejects names longer than 63 chars', () => {
    const r = BucketName.create('a'.repeat(64));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-too-long');
  });
});

describe('BucketName — character set', () => {
  it('rejects uppercase letters', () => {
    const r = BucketName.create('Contracts');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });

  it('rejects underscores', () => {
    const r = BucketName.create('contract_docs');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });

  it('rejects spaces', () => {
    const r = BucketName.create('contract docs');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });

  it('rejects unicode letters (e.g., accented)', () => {
    const r = BucketName.create('contratoção');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });
});

describe('BucketName — boundary character rules', () => {
  it('rejects names starting with a hyphen', () => {
    const r = BucketName.create('-contracts');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-start-alphanumeric');
  });

  it('rejects names ending with a hyphen', () => {
    const r = BucketName.create('contracts-');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-end-alphanumeric');
  });

  it('rejects names starting with a dot', () => {
    const r = BucketName.create('.contracts');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-start-alphanumeric');
  });

  it('rejects names ending with a dot', () => {
    const r = BucketName.create('contracts.');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-end-alphanumeric');
  });
});

describe('BucketName — consecutive dots', () => {
  it('rejects two consecutive dots', () => {
    const r = BucketName.create('contracts..docs');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-consecutive-dots');
  });
});

describe('BucketName — IP address format', () => {
  it('rejects strings shaped like an IPv4 address', () => {
    const r = BucketName.create('192.168.1.1');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-ip-address-format');
  });

  it('rejects 0.0.0.0', () => {
    const r = BucketName.create('0.0.0.0');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-ip-address-format');
  });
});

describe('BucketName — reserved prefixes', () => {
  it('rejects xn-- prefix', () => {
    const r = BucketName.create('xn--mybucket');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-prefix');
  });

  it('rejects sthree- prefix', () => {
    const r = BucketName.create('sthree-mybucket');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-prefix');
  });

  it('rejects sthree-configurator prefix', () => {
    const r = BucketName.create('sthree-configurator-foo');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-prefix');
  });
});

describe('BucketName — reserved suffixes', () => {
  it('rejects -s3alias suffix', () => {
    const r = BucketName.create('mybucket-s3alias');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-suffix');
  });

  it('rejects --ol-s3 suffix', () => {
    const r = BucketName.create('mybucket--ol-s3');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-suffix');
  });
});
