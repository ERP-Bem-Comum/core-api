// CI-RUNNER-NON-DESTRUCTIVE (Parte A da #500) — cofre de secrets do runner de integração.
//
// Antes de escrever os secrets de TESTE, faz backup byte-a-byte de qualquer secret preexistente (os
// do dev) em memória. No `finally` do runner, `restoreSecrets`:
//   - restaura byte-a-byte os que existiam antes (o dev recupera seus secrets exatamente), e
//   - REMOVE os que não existiam (o comportamento de hoje para quem não tinha secrets → fica limpo).
// Assim o runner de integração nunca destrói os secrets locais de dev.
//
// `baseDir` é parametrizável: o teste aponta a um `mkdtemp`; o runner usa 'secrets' (o compose lê de
// `./secrets/*.txt`). Os secrets são escritos em 0o644 — o seed `readonly_bi` roda como uid `mysql`
// e lê os arquivos via `cat`; um modo mais restrito owned pelo host faria o seed abortar por
// *Permission denied* (invariante de CTR-INFRA-INTEGRATION-SECRET-PERMS).

import { mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// `latin1` é byte-exato (cada byte ↔ um code point 0..255), então o backup/restore preserva o
// conteúdo original byte-a-byte e mantém `SecretBackup` profundamente readonly (string imutável, sem
// `Buffer`) — casando com `prefer-readonly-parameter-types` sem eslint-disable.
type SecretEntry = Readonly<{
  path: string;
  existed: boolean;
  original: string | undefined; // conteúdo preexistente (latin1) quando existia; undefined se novo
}>;

export type SecretBackup = Readonly<{
  entries: readonly SecretEntry[];
}>;

export const backupAndWriteTestSecrets = (
  baseDir: string,
  testSecrets: Readonly<Record<string, string>>,
): SecretBackup => {
  mkdirSync(baseDir, { recursive: true });
  const entries: SecretEntry[] = [];
  for (const [filename, value] of Object.entries(testSecrets)) {
    const path = join(baseDir, filename);
    const existed = existsSync(path);
    const original = existed ? readFileSync(path, 'latin1') : undefined;
    entries.push({ path, existed, original });
    writeFileSync(path, value);
    chmodSync(path, 0o644);
  }
  return { entries };
};

export const restoreSecrets = (backup: SecretBackup): void => {
  for (const entry of backup.entries) {
    if (entry.existed && entry.original !== undefined) {
      writeFileSync(entry.path, entry.original, 'latin1'); // byte-a-byte
    } else {
      rmSync(entry.path, { force: true });
    }
  }
};
