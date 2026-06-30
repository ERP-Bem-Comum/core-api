import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createBucketName } from '#src/modules/contracts/application/ports/document-storage.types.ts';

// Regras canônicas vêm da doc AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
// Cada teste mapeia para um critério de aceite do 000-request.md.

describe('BucketName — module-as-namespace (Padrão D)', () => {
  it('createBucketName is exported as a function', () => {
    // Arrange / Act / Assert
    assert.equal(typeof createBucketName, 'function');
  });
});

describe('BucketName — happy path', () => {
  it('accepts a typical lowercase name with hyphens', () => {
    // Arrange / Act
    const r = createBucketName('contracts-documents');
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, 'contracts-documents');
  });

  it('accepts the minimum length of 3 characters', () => {
    // Arrange / Act
    const r = createBucketName('abc');
    // Assert
    assert.equal(isOk(r), true);
  });

  it('accepts the maximum length of 63 characters', () => {
    // Arrange / Act
    const r = createBucketName('a'.repeat(63));
    // Assert
    assert.equal(isOk(r), true);
  });

  it('accepts digits at both ends', () => {
    // Arrange / Act
    const r = createBucketName('1bucket9');
    // Assert
    assert.equal(isOk(r), true);
  });

  it('accepts names with single dots (FQDN-like)', () => {
    // Arrange / Act
    const r = createBucketName('contracts.documents.prod');
    // Assert
    assert.equal(isOk(r), true);
  });
});

describe('BucketName — length rules', () => {
  it('rejects names shorter than 3 chars', () => {
    // Arrange / Act
    const r = createBucketName('ab');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-too-short');
  });

  it('rejects empty string as too short', () => {
    // Arrange / Act
    const r = createBucketName('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-too-short');
  });

  it('rejects names longer than 63 chars', () => {
    // Arrange / Act
    const r = createBucketName('a'.repeat(64));
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-too-long');
  });
});

describe('BucketName — character set', () => {
  it('rejects uppercase letters', () => {
    // Arrange / Act
    const r = createBucketName('Contracts');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });

  it('rejects underscores', () => {
    // Arrange / Act
    const r = createBucketName('contract_docs');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });

  it('rejects spaces', () => {
    // Arrange / Act
    const r = createBucketName('contract docs');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });

  it('rejects unicode letters (e.g., accented)', () => {
    // Arrange / Act
    const r = createBucketName('contratoção');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-invalid-chars');
  });
});

describe('BucketName — boundary character rules', () => {
  it('rejects names starting with a hyphen', () => {
    // Arrange / Act
    const r = createBucketName('-contracts');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-start-alphanumeric');
  });

  it('rejects names ending with a hyphen', () => {
    // Arrange / Act
    const r = createBucketName('contracts-');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-end-alphanumeric');
  });

  it('rejects names starting with a dot', () => {
    // Arrange / Act
    const r = createBucketName('.contracts');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-start-alphanumeric');
  });

  it('rejects names ending with a dot', () => {
    // Arrange / Act
    const r = createBucketName('contracts.');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-must-end-alphanumeric');
  });
});

describe('BucketName — consecutive dots', () => {
  it('rejects two consecutive dots', () => {
    // Arrange / Act
    const r = createBucketName('contracts..docs');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-consecutive-dots');
  });
});

describe('BucketName — IP address format', () => {
  it('rejects strings shaped like an IPv4 address', () => {
    // Arrange / Act
    const r = createBucketName('192.168.1.1');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-ip-address-format');
  });

  it('rejects 0.0.0.0', () => {
    // Arrange / Act
    const r = createBucketName('0.0.0.0');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-ip-address-format');
  });
});

describe('BucketName — reserved prefixes', () => {
  it('rejects xn-- prefix', () => {
    // Arrange / Act
    const r = createBucketName('xn--mybucket');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-prefix');
  });

  it('rejects sthree- prefix', () => {
    // Arrange / Act
    const r = createBucketName('sthree-mybucket');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-prefix');
  });

  it('rejects sthree-configurator prefix', () => {
    // Arrange / Act
    const r = createBucketName('sthree-configurator-foo');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-prefix');
  });
});

describe('BucketName — reserved suffixes', () => {
  it('rejects -s3alias suffix', () => {
    // Arrange / Act
    const r = createBucketName('mybucket-s3alias');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-suffix');
  });

  it('rejects --ol-s3 suffix', () => {
    // Arrange / Act
    const r = createBucketName('mybucket--ol-s3');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bucket-name-reserved-suffix');
  });
});
