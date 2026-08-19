// Colunas de identificador com collation binária — a collation vem do TIPO, não de edição manual.
//
// A collation binária não é preferência: medido em MySQL 8.4.10 real, um JOIN entre coluna `bin` e
// coluna `unicode_ci` cai de `type: eq_ref` para `type: ALL` — full scan, sem erro algum. E buscar o
// mesmo UUID em caixa alta devolve 0 linhas em `bin` e 1 em `unicode_ci`.
//
// Antes do #636 o `COLLATE utf8mb4_bin` era inserido à mão no SQL que `drizzle-kit generate` emite,
// conforme instrução em comentário nos `schemas/mysql.ts`. Isso transfere a garantia para a memória
// de quem roda o comando: um identificador novo com a edição esquecida herda `utf8mb4_unicode_ci`
// em silêncio. Já aconteceu com 34 colunas vivas — ver #637.
//
// `customType` resolve porque `dataType()` é emitido VERBATIM no DDL. Medido em worktree
// descartável (2026-08-05): a 1ª geração emite `` `id` varchar(36) COLLATE utf8mb4_bin NOT NULL ``,
// e a 2ª responde "No schema changes" — idempotente, sem drift, que era o risco real de injetar SQL
// num `dataType()`.
//
// ## Por que uma família de tipos, e não um `binId` genérico
//
// A collation binária vale para 7 larguras distintas neste repositório, e a largura carrega
// SIGNIFICADO: `varchar(14)` é CNPJ, `varchar(11)` é CPF, `char(64)` é hash SHA-256 hex. Um tipo
// único parametrizado por `length` devolveria ao schema a decisão de qual número usar — que é
// exatamente onde o erro mora. Cada tipo abaixo nomeia O QUE a coluna é; a largura é consequência.
//
// ## O que estes tipos NÃO fazem
//
// Não padronizam `char` × `varchar`. Três outboxes (`contracts`, `budget-plans`, `programs`) usam
// `char(36)` onde o resto do repositório usa `varchar(36)`; `auth` usa `char(64)` para `token_hash`
// e `partners` usa `varchar(64)` para o dele. Unificar mudaria o tipo da coluna e geraria `ALTER`
// real em produção — mudança de comportamento, não refactor. A divergência está registrada; aqui
// ela é PRESERVADA para que a adoção destes tipos não emita migration alguma.

import { customType } from 'drizzle-orm/mysql-core';

type BinaryText = ReturnType<typeof customType<{ data: string; driverData: string }>>;

/** Fábrica interna: um tipo de texto de largura fixa com comparação binária. */
const binaryText = (sqlType: string): BinaryText =>
  customType<{ data: string; driverData: string }>({ dataType: () => sqlType });

/**
 * Identificador UUID v4 — PK de domínio, FK ou `*_ref` cross-agregado (ADR-0018).
 * Forma canônica do repositório: 100 das 119 colunas binárias.
 */
export const uuidKey = binaryText('varchar(36) COLLATE utf8mb4_bin');

/**
 * Identificador UUID v4 em largura FIXA — usado pelos outboxes de `contracts`, `budget-plans` e
 * `programs`. Equivalente semântico de {@link uuidKey}; difere só na forma de armazenamento.
 * Não usar em coluna nova: existe para preservar o que já está em produção.
 */
export const uuidKeyFixed = binaryText('char(36) COLLATE utf8mb4_bin');

/** CNPJ na forma canônica — 14 posições ALFANUMÉRICAS (ADR-0044), sem máscara. */
export const cnpjKey = binaryText('varchar(14) COLLATE utf8mb4_bin');

/** CPF na forma canônica — 11 dígitos, sem máscara. */
export const cpfKey = binaryText('varchar(11) COLLATE utf8mb4_bin');

/**
 * Hash SHA-256 em hexadecimal — 64 caracteres ASCII, largura fixa.
 * Binário porque hash se compara byte a byte: `unicode_ci` acharia `A` igual a `a`.
 */
export const sha256HexKey = binaryText('char(64) COLLATE utf8mb4_bin');

/**
 * Chave natural opaca de até 64 — `fitid` do extrato OFX e hash de convite.
 * "Opaca" é a propriedade que importa: o valor vem de fora e só se compara por igualdade exata.
 */
export const opaqueKey = binaryText('varchar(64) COLLATE utf8mb4_bin');

/**
 * Nome de permissão RBAC — chave natural case-sensitive (`contracts:read` ≠ `Contracts:Read`).
 * É o único identificador binário que é legível por humano, e continua sendo identificador.
 */
export const permissionKey = binaryText('varchar(128) COLLATE utf8mb4_bin');

/**
 * Chave de objeto em object storage — `prefixo/nome`, atribuída por quem depositou.
 *
 * Binária porque **chave de S3 é case-sensitive**: `unicode_ci` acharia `X.RET` igual a `x.ret` e
 * dois objetos distintos colidiriam numa PK. Larga porque o prefixo é configurável por ambiente
 * (`VAN_S3_PREFIX_*`) e o nome vem do banco — 64 não é margem, é aposta.
 */
export const objectStorageKey = binaryText('varchar(255) COLLATE utf8mb4_bin');
