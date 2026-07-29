// DEADMAN-AUDIT-FALSE-FIRED (#368) — decisão do auditor do dead-man switch.
//
// A decisão saiu do bash inline de `.github/workflows/deadman-audit.yml` para cá porque o defeito
// era de LÓGICA (bootstrap tratado como morte), e lógica em YAML não tem teste. O workflow segue
// dono do I/O (baixar do S3, self-heal, commit keep-alive); este módulo só decide.
//
// A régua é do ADR-0042 (`0042-deadman-switch-redundant.md:37`):
//   "Dispara o payload (scripts de contingência) se `now − last_seen > limite`."
// Sem `last_seen` a diferença é INDEFINIDA — logo a condição não é satisfeita, e o estado é
// `bootstrap`, não `dead`. Era o `else status=DEAD` que produzia as 14 issues `sem sinal há 0h`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface EmitterConfig {
  readonly id: string;
  readonly thresholdDays: number;
}

export type AuditStatus = 'alive' | 'dead' | 'bootstrap';

export interface EmitterVerdict {
  readonly emitter: string;
  readonly status: AuditStatus;
  /**
   * `max(ts)` do emissor — o campo `last_seen` do contrato de dados
   * (`handbook/infrastructure/07-deadman-switch-data-contracts.md:75`). `null` em bootstrap, e não
   * `''`: string vazia reintroduziria o `last_seen=` mudo do formato v1.
   */
  readonly lastSeen: string | null;
  /** `null` quando nunca houve ping — nunca `0`, que é o que compunha o título mentiroso. */
  readonly ageHours: number | null;
  readonly thresholdDays: number;
  readonly firesPayload: boolean;
}

export interface AuditInput {
  readonly emitters: readonly EmitterConfig[];
  readonly lastSeenByEmitter: Readonly<Record<string, string>>;
  readonly now: string;
  readonly alreadyAlerted: readonly string[];
}

// As chaves do JSON externo são snake_case; ficam como string literal no acesso, e não viram tipo —
// assim o contrato interno é todo camelCase e a borda valida `unknown` em vez de confiar no shape.
type Json = Record<string, unknown>;

const asRecord = (v: unknown): Json | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Json) : null;

const parseLine = (line: string): Json | null => {
  try {
    return asRecord(JSON.parse(line));
  } catch {
    return null; // linha corrompida não derruba a auditoria
  }
};

const isPositiveInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0;

/**
 * ISO-8601 UTC **estrito** — o `Z` é obrigatório. `Date.parse` aceita formatos frouxos, e um `ts`
 * sem `Z` seria lido como hora LOCAL da máquina: o auditor do GitHub Actions (UTC) e o 2º auditor
 * do ERP-INFRA (ADR-0042 D2) chegariam a vereditos diferentes para o mesmo dado.
 *
 * A fração de segundo tem largura FIXA de 3 dígitos, e não `(?:\.\d{1,3})?`. Largura variável
 * quebra a ordenação lexicográfica de que `lastSeenFromPings` depende: `'Z'`(90) > `'.'`(46), então
 * `…T05:00:00Z` vence `…T05:00:00.001Z` na string, elegendo como "último sinal" o instante mais
 * ANTIGO. Os dois únicos produtores emitem 3 dígitos — `date -u +…%S.000Z` no workflow e
 * `new Date().toISOString()` no entrypoint —, então exigir a forma canônica não descarta dado real.
 */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * O round-trip contra `toISOString()` é o que barra data **inexistente** que o `Date.parse` aceita
 * fazendo rollover — `2026-02-30` vira `2026-03-02`, `2025-02-29` vira `2025-03-01`. Sem ele, um
 * `ts` corrompido não é rejeitado: vira um instante falso e plausível. O guard de `NaN` precisa vir
 * ANTES, porque `new Date(inválido).toISOString()` lança `RangeError`.
 */
const isIsoUtc = (v: unknown): v is string =>
  typeof v === 'string' &&
  ISO_UTC.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString() === v;

/**
 * Tolerância de relógio adiantado. Um ping com `ts` até este limite no futuro é skew legítimo entre
 * emissor e auditor; além disso é dado corrompido (ou forjado) e a linha é descartada — senão um
 * `ts` futuro produz idade negativa, que nunca cruza o limiar e silencia o alerta para sempre.
 */
const CLOCK_SKEW_TOLERANCE_HOURS = 2;

/**
 * Lê `deadman/emitters.json`. O `default_threshold_days` é FALLBACK por emissor, não valor único —
 * ignorar o `threshold_days` de cada um esvaziava o D3 do ADR-0042 ("o número entra no contrato").
 */
export const parseEmitterConfig = (json: string): readonly EmitterConfig[] => {
  const raw = asRecord(JSON.parse(json));
  if (raw === null) throw new Error('emitters.json: raiz não é objeto');

  const fallback = raw['default_threshold_days'];
  if (!isPositiveInt(fallback)) throw new Error('emitters.json: default_threshold_days inválido');

  const emitters = raw['emitters'];
  if (!Array.isArray(emitters)) throw new Error('emitters.json: emitters não é lista');

  const seen = new Set<string>();
  // `item: unknown` é obrigatório: `Array.isArray` sobre `unknown` narrowa o elemento para `any`, e
  // nem o tsc nem `no-unsafe-argument` (que permite any→unknown) reclamariam se esta anotação
  // sumisse. É a única barreira contra `any` no caminho de parse.
  return emitters.map((item: unknown, i): EmitterConfig => {
    const e = asRecord(item);
    const id = e?.['id'];
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error(`emitters.json: emitters[${i}].id ausente`);
    }
    // Id duplicado geraria um veredito por entrada → duas issues para a mesma morte, no ticket que
    // nasceu de 14 issues idênticas.
    if (seen.has(id)) throw new Error(`emitters.json: id duplicado '${id}' em emitters[${i}]`);
    seen.add(id);
    const declared = e?.['threshold_days'];
    return { id, thresholdDays: isPositiveInt(declared) ? declared : fallback };
  });
};

const hoursBetween = (fromIso: string, toIso: string): number => {
  const from = Date.parse(fromIso);
  if (Number.isNaN(from)) throw new Error(`last_seen inválido: ${fromIso}`);
  const to = Date.parse(toIso);
  if (Number.isNaN(to)) throw new Error(`now inválido: ${toIso}`);
  // Clamp em 0: skew de relógio não pode produzir idade negativa (o contrato §3 declara `age_h`
  // como idade, e um negativo nunca cruzaria o limiar — silenciaria o alerta).
  return Math.max(0, Math.floor((to - from) / 3_600_000));
};

/**
 * Decide o estado de cada emissor. Função pura: o `now` é injetado, nunca `Date.now()` — decisão de
 * auditor tem de ser determinística e reproduzível a partir do `audit.jsonl`.
 */
export const auditEmitters = (input: AuditInput): readonly EmitterVerdict[] =>
  input.emitters.map((emitter): EmitterVerdict => {
    const lastSeen = input.lastSeenByEmitter[emitter.id];

    // Nunca pingou: `now − last_seen` é indefinido, a condição do ADR-0042 não é satisfeita.
    //
    // O guard é `!isIsoUtc`, e não `=== undefined || === ''`, porque `lastSeenByEmitter` é um
    // objeto comum e portanto herda `Object.prototype`: um emissor chamado `toString`/`constructor`
    // /`valueOf` que nunca pingou lê a FUNÇÃO herdada, não `undefined`. Ela passava pelo guard
    // antigo, chegava em `hoursBetween` e virava `last_seen inválido: function toString() {…}` —
    // exceção que mata o step antes do commit de keep-alive. Validar a FORMA do valor cobre isso e
    // qualquer outro lixo, independentemente de como o chamador montou o mapa (os testes passam
    // literais, que têm o mesmo protótipo). Efeito colateral: `hoursBetween` só recebe ISO válido.
    if (!isIsoUtc(lastSeen)) {
      return {
        emitter: emitter.id,
        status: 'bootstrap',
        lastSeen: null,
        ageHours: null,
        thresholdDays: emitter.thresholdDays,
        firesPayload: false,
      };
    }

    const ageHours = hoursBetween(lastSeen, input.now);
    const dead = ageHours > emitter.thresholdDays * 24;

    return {
      emitter: emitter.id,
      status: dead ? 'dead' : 'alive',
      lastSeen,
      ageHours,
      thresholdDays: emitter.thresholdDays,
      // Dedup por TRANSIÇÃO: morto que já alertou não redispara. O status segue `dead` — o dedup
      // suprime o alerta, não o diagnóstico.
      firesPayload: dead && !input.alreadyAlerted.includes(emitter.id),
    };
  });

/**
 * Deriva quem já foi alertado a partir do próprio `audit.jsonl` — o estado precisa sobreviver entre
 * execuções do cron, e o arquivo já é commitado pelo keep-alive do workflow (sem peça nova).
 *
 * Regra: vale o registro MAIS RECENTE de cada emissor, e ele só conta como alertado quando está
 * `dead` **e** carrega `payload_fired: true` — o contrato (§3) define esse campo como *"presente e
 * `true` apenas quando o payload foi disparado"*. Deduplicar por `status` sozinho faria uma falha
 * transitória do `gh issue create` suprimir a retentativa, perdendo a morte em silêncio.
 * Se voltou a `alive`/`bootstrap`, a marca cai e uma morte futura volta a disparar.
 *
 * A comparação é case-insensitive porque o formato v1 grafa `"DEAD"` e o v2 grafa `"dead"` — ler só
 * a grafia nova faria um emissor já alertado no v1 re-alertar em falso na primeira execução v2.
 */
export const deriveAlreadyAlerted = (auditJsonl: string): readonly string[] => {
  const alerted = new Map<string, boolean>();
  for (const line of auditJsonl.split('\n')) {
    if (line.trim() === '') continue;
    const rec = parseLine(line);
    if (rec === null) continue;
    const emitter = rec['emitter'];
    const status = rec['status'];
    // O `emitter:"*"` dos registros v1 não identifica ninguém — ignorado no dedup.
    if (typeof emitter !== 'string' || emitter === '*' || typeof status !== 'string') continue;
    alerted.set(emitter, status.toLowerCase() === 'dead' && rec['payload_fired'] === true);
  }
  return [...alerted].filter(([, wasAlerted]) => wasAlerted).map(([emitter]) => emitter);
};

/**
 * Extrai o ping mais recente por emissor de um JSONL de pings (`{emitter, ts}`).
 *
 * A ordenação é lexicográfica, o que **só** equivale a cronológica porque `isIsoUtc` garante que
 * toda `ts` aceita tem exatamente o mesmo formato. Sem essa validação, qualquer string começando
 * por letra vence toda data ISO (letra > dígito) — e como `history.jsonl` é append-only, uma linha
 * corrompida venceria para sempre, derrubando a auditoria em toda execução futura.
 *
 * `notAfter` (o `now` do auditor) descarta pings do futuro além da tolerância de skew. Linha
 * inválida é **ignorada**, nunca lança: o step não pode morrer antes do keep-alive.
 */
export const lastSeenFromPings = (
  pingsJsonl: string,
  notAfter?: string,
): Readonly<Record<string, string>> => {
  const ceiling =
    notAfter !== undefined && isIsoUtc(notAfter)
      ? Date.parse(notAfter) + CLOCK_SKEW_TOLERANCE_HOURS * 3_600_000
      : Number.POSITIVE_INFINITY;

  const latest = new Map<string, string>();
  for (const line of pingsJsonl.split('\n')) {
    if (line.trim() === '') continue;
    const rec = parseLine(line);
    if (rec === null) continue;
    const emitter = rec['emitter'];
    const ts = rec['ts'];
    if (typeof emitter !== 'string' || !isIsoUtc(ts)) continue;
    if (Date.parse(ts) > ceiling) continue;
    const current = latest.get(emitter);
    if (current === undefined || ts > current) latest.set(emitter, ts);
  }
  return Object.fromEntries(latest);
};

/**
 * Só `ENOENT` vira string vazia (o arquivo ainda não existe — bootstrap legítimo). Qualquer outro
 * erro de I/O propaga: engoli-los faria uma falha de permissão/disco parecer "sem dados", o que
 * **resetaria o dedup** e reabriria uma issue já alertada.
 */
const readOrEmpty = (path: string): string => {
  try {
    return readFileSync(path, 'utf-8');
  } catch (e: unknown) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw e;
  }
};

// Entrypoint do workflow: lê os arquivos, decide, e imprime UM JSON com os vereditos. Quem age
// (abrir issue, webhook, gravar audit.jsonl) é o YAML — este script não tem efeito colateral.
if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , emittersPath, pingsPath, auditPath, nowArg] = process.argv;
  if (emittersPath === undefined || pingsPath === undefined || auditPath === undefined) {
    console.error(
      'uso: deadman-audit.ts <emitters.json> <pings.jsonl> <audit.jsonl> [now-iso]\n' +
        '  imprime {"now":…,"verdicts":[…]} em stdout',
    );
    process.exit(2);
  }

  const now = nowArg ?? new Date().toISOString();
  const verdicts = auditEmitters({
    emitters: parseEmitterConfig(readFileSync(emittersPath, 'utf-8')),
    lastSeenByEmitter: lastSeenFromPings(readOrEmpty(pingsPath), now),
    now,
    alreadyAlerted: deriveAlreadyAlerted(readOrEmpty(auditPath)),
  });

  console.log(JSON.stringify({ now, verdicts }));
}
