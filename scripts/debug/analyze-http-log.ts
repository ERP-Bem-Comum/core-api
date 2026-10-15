// Análise descartável: correlaciona req e res do Pino pelo `reqId` e agrupa por rota e status.
// Só é possível agora que o log vai para arquivo — o `capture-pane` do tmux quebrava o JSON em 90
// colunas, e nenhum `reqId` sobrevivia inteiro para cruzar.

import { readFileSync } from 'node:fs';

type Line = Readonly<{
  reqId?: string;
  req?: Readonly<{ method?: string; url?: string }>;
  res?: Readonly<{ statusCode?: number }>;
  msg?: string;
}>;

const path = process.env['LOG'] ?? '.tmp/logs/http.jsonl';
const raw = readFileSync(path, 'utf-8').split('\n');

const requests = new Map<string, string>();
const statuses = new Map<string, number>();
let naoJson = 0;

/**
 * Uma linha do log, ou `undefined` se não é JSON.
 *
 * @remarks
 * O arquivo recebe `2>&1`, então stdout e stderr caem juntos: o JSON do Pino convive com linhas
 * de erro em texto puro, como o `falha ao montar worker`. Quem parseia tem de tolerar as duas, e
 * isolar o `try` numa função evita o `let` sem inicialização que o `init-declarations` recusa.
 */
const comoJson = (line: string): Line | undefined => {
  try {
    return JSON.parse(line) as Line;
  } catch {
    return undefined;
  }
};

for (const line of raw) {
  if (line.trim() === '') continue;
  const parsed = comoJson(line);
  if (parsed === undefined) {
    naoJson += 1;
    continue;
  }
  const id = parsed.reqId;
  if (id === undefined) continue;
  const method = parsed.req?.method;
  const url = parsed.req?.url;
  if (method !== undefined && url !== undefined) {
    // A rota normalizada: UUIDs e números viram `:id`, senão cada recurso cria um grupo próprio.
    const route = url
      .split('?')[0]
      ?.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+(?=\/|$)/g, '/:n');
    requests.set(id, `${method} ${route ?? url}`);
  }
  const code = parsed.res?.statusCode;
  if (code !== undefined) statuses.set(id, code);
}

const byStatus = new Map<number, number>();
const byRouteStatus = new Map<string, number>();

for (const [id, code] of statuses) {
  byStatus.set(code, (byStatus.get(code) ?? 0) + 1);
  const route = requests.get(id) ?? '(request não correlacionado)';
  const key = `${String(code)}  ${route}`;
  byRouteStatus.set(key, (byRouteStatus.get(key) ?? 0) + 1);
}

console.log(`linhas totais        ${String(raw.length)}`);
console.log(`linhas não-JSON      ${String(naoJson)}   (stderr do processo, misturado pelo 2>&1)`);
console.log(`requests com status  ${String(statuses.size)}`);
console.log(
  `correlacionados      ${String([...statuses.keys()].filter((i) => requests.has(i)).length)}`,
);

console.log('\n=== POR STATUS ===');
for (const [code, n] of [...byStatus].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(code)}  ${String(n)}`);
}

console.log('\n=== POR STATUS + ROTA (top 24) ===');
for (const [key, n] of [...byRouteStatus].sort((a, b) => b[1] - a[1]).slice(0, 24)) {
  console.log(`  ${String(n).padStart(3)}×  ${key}`);
}
