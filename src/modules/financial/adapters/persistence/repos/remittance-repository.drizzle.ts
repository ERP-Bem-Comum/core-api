// Adapter Drizzle do RemittanceRepository (MySQL).
//
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
// (.claude/rules/adapters.md §"converter para Result na borda").
import { eq, inArray, and, desc, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  Remittance,
  RemittancePayable,
  RemittanceStatus,
} from '#src/modules/financial/domain/remittance/types.ts';
import type { RemittanceSaveEvent } from '#src/modules/financial/application/ports/remittance-repository.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type {
  HeldPayable,
  RemittanceRepository,
  RemittanceRepositoryError,
  RemittanceSaveError,
} from '#src/modules/financial/application/ports/remittance-repository.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finRemittances, finRemittancePayables, finPayables } from '../schemas/mysql.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';
import type { FinRemittanceRow } from '../schemas/mysql.ts';

const logRepo = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-remittance-repository] ${op} failed: ${String(cause)}\n`);
};

// Sentinela da reserva perdida (#789): o `catch` precisa distinguir "perdi a corrida" — desfecho
// ESPERADO sob concorrência — de "o banco caiu", e faz isso por identidade (`===`), não por
// mensagem, que refatoração muda sem avisar.
//
// Instância única e `Error` de verdade, por duas restrições que se somam: `@typescript-eslint/
// only-throw-error` recusa lançar símbolo, e `class` é barrada neste repositório, então `instanceof`
// de um tipo próprio está fora. Uma constante compartilhada resolve as duas.
//
// ⚠️ O `stack` dela aponta para a carga deste módulo, não para o ponto do `throw` — o preço de ser
// singleton. É inofensivo porque ela nunca é logada nem propagada: o `catch` a intercepta e a
// traduz. Se algum dia ela precisar viajar, troque por uma factory que crie o `Error` na hora.
//
// Sobrevive ao trajeto porque o driver relança o objeto original: `mysql2/session.js` roda o
// ROLLBACK no `catch` e faz `throw err` do mesmo valor, sem empacotar.
const PAYABLES_ALREADY_HELD = new Error('remittance-payables-already-held');

// Sentinela da transição recusada (ADR-0065 §2), pelas MESMAS restrições da de cima: identidade por
// `===`, `Error` de verdade, instância única.
//
// Distinta de `PAYABLES_ALREADY_HELD` de propósito. As duas nascem no mesmo bloco e desfazem a mesma
// transação, mas dizem coisas diferentes ao operador: "está em outra remessa" o manda à lista de
// remessas; "não está aprovado" o manda ao fluxo de aprovação. Uma sentinela só forçaria a borda a
// adivinhar qual das duas telas abrir.
const PAYABLE_NOT_APPROVED = new Error('remittance-payable-not-approved');

// mysql2 devolve `[ResultSetHeader, FieldPacket[]]`; o Drizzle expõe o raw do driver via cast.
//
// ⚠️ SEXTA ocorrência deste cast no repositório, em duas formas divergentes — `document-repository`
// (×2), `financial-etl-store`, `payable-repository` (sem o `as unknown as`), `reconciliation-
// repository` e esta. Fica local porque extraí-lo tocaria cinco arquivos fora do escopo do #792;
// a concentração num helper de `shared/persistence` está registrada na **#844**, com o gate que
// impede a sétima. Anotar a repetição é o que a impede de parecer inevitável.
const affectedRowsOf = (result: unknown): number =>
  (result as unknown as [{ affectedRows: number }])[0].affectedRows;

// ─── Tradução de instante entre o domínio e a coluna `datetime` ──────────────────────────────────
//
// O domínio guarda instante como STRING ISO 8601 UTC (`2026-08-18T15:01:24.615Z`) — é o que
// `generate-remittance.ts` produz com `toISOString()`, e o que o agente publica em `executadoEm`.
// A coluna é `datetime(3)` com `mode: 'string'`, e nesse modo o Drizzle repassa a string CRUA ao
// driver: o MySQL recebe o `T` e o `Z` e recusa com **1292** (`Incorrect datetime value`).
//
// Medido contra MySQL 8.4 real:
//
//   INSERT INTO t VALUES ('2026-08-19T10:00:00.000Z');
//   ERROR 1292 (22007): Incorrect datetime value: '2026-08-19T10:00:00.000Z' for column 'd'
//
// ⚠️ Consequência antes desta correção: **`POST /financial/remittances` nunca funcionou contra banco
// real** — toda geração morria em `remittance-persist-failed` (503). O caminho só passava no repo
// in-memory.
//
// E a suíte de integração ficava VERDE, porque a fixture escrevia `'2026-08-11 14:00:00.000'` à mão
// — formato do MySQL, que o use case não produz. Teste alimentado com dado que a aplicação nunca
// gera não prova o caminho da aplicação: prova outro caminho. A fixture foi corrigida junto.
//
// A conversão fica AQUI porque o formato é do MySQL, não do domínio: quem conhece o dialeto é o
// adapter (ADR-0006). `datetime` não guarda fuso, então ida e volta são ambas em UTC — o instante
// gravado é o mesmo que se lê, independente do `time_zone` da sessão.
const pad = (value: number, width = 2): string => String(value).padStart(width, '0');

// Exportadas para teste: são as duas regras que decidem se um pagamento consegue ser gravado, e a
// suíte de integração só as exercita sob `MYSQL_INTEGRATION=1`. Sem cobertura no gate rápido, a
// regressão volta a aparecer no ambiente, não no CI.
export const toMysqlDateTime = (iso: string): string => {
  const at = new Date(iso);
  // String que não é instante reconhecível segue CRUA, de propósito: falhar no banco é melhor que
  // gravar silenciosamente um valor inventado numa coluna que decide quando um pagamento saiu.
  if (Number.isNaN(at.getTime())) return iso;
  return (
    `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())} ` +
    `${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}:${pad(at.getUTCSeconds())}.` +
    pad(at.getUTCMilliseconds(), 3)
  );
};

// Volta ao ISO que o domínio (e o contrato HTTP) espera. Sem isto, a leitura devolveria
// `2026-08-18 15:01:24.615`, que `Date` não parseia de forma portável entre browsers.
export const toIsoDateTime = (stored: string): string =>
  stored.includes('T') ? stored : `${stored.replace(' ', 'T')}Z`;

// Estados que PRENDEM o documento. `Discarded` fica de fora — é o único que devolve o documento
// para a fila, e exige decisão humana. Espelha `holdsDocuments` do domínio; a lista está aqui
// porque o filtro precisa ir para o SQL, não para a memória.
//
// ⚠️ `export` deliberado, e não é vazamento de detalhe: a invariante `PAY-01`
// (`tests/modules/financial/adapters/persistence/remittance-repository.drizzle-mysql.test.ts`)
// vigia o estado que esta lista define — nenhum título preso por duas remessas VIVAS —, e é a
// última rede do #789 no dia em que o lock falhar. Uma cópia da lista no teste faria a rede
// envelhecer em silêncio no primeiro status novo que entrasse aqui: ela seguiria verde vigiando
// uma regra que deixou de ser esta. Quem acrescentar estado a `HOLDING` acrescenta à vigilância no
// mesmo ato — que é a única forma de as duas não divergirem.
export const HOLDING: readonly RemittanceStatus[] = ['Queued', 'Transmitted', 'Failed'];

const toDomain = (
  row: Readonly<FinRemittanceRow>,
  payables: readonly RemittancePayable[],
): Result<Remittance, 'remittance-row-invalid'> => {
  const id = RemittanceId.rehydrate(row.id);
  if (!id.ok) return err('remittance-row-invalid');

  const cedenteAccountId = CedenteAccountId.rehydrate(row.cedenteAccountId);
  if (!cedenteAccountId.ok) return err('remittance-row-invalid');

  return ok({
    id: id.value,
    cedenteAccountId: cedenteAccountId.value,
    nsa: row.nsa,
    fileName: row.fileName,
    contentHash: row.contentHash,
    payables,
    status: row.status as RemittanceStatus,
    generatedAt: toIsoDateTime(row.generatedAt),
    ...(row.settledAt !== null ? { settledAt: toIsoDateTime(row.settledAt) } : {}),
    ...(row.detail !== null ? { detail: row.detail } : {}),
  });
};

export const createDrizzleRemittanceRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): RemittanceRepository => {
  const { db } = handle;

  // A ordenação por `payableId` é deliberada e independe da ordem de emissão: o agregado não
  // promete ordem, e uma leitura estável é o que torna a comparação em teste previsível. A ordem da
  // emissão está preservada onde ela importa — dentro da própria referência, que carrega a posição.
  //
  // Ordenar por `documentId` não serviria: títulos irmãos compartilham a nota, e o desempate entre
  // eles ficaria a cargo do otimizador.
  const loadPayables = async (remittanceId: string): Promise<readonly RemittancePayable[]> => {
    const rows = await db
      .select({
        payableId: finRemittancePayables.payableId,
        documentId: finRemittancePayables.documentId,
        yourNumber: finRemittancePayables.yourNumber,
      })
      .from(finRemittancePayables)
      .where(eq(finRemittancePayables.remittanceId, remittanceId));
    return rows
      .map((r) => ({
        payableId: r.payableId,
        documentId: r.documentId,
        yourNumber: r.yourNumber,
      }))
      .sort((a, b) => a.payableId.localeCompare(b.payableId));
  };

  return {
    // Cabeçalho e vínculos na MESMA transação: uma remessa sem seus documentos não prenderia nada,
    // e é justamente o vínculo que impede a segunda inclusão. Meia gravação aqui reabre o caminho
    // para pagamento em dobro.
    //
    // SELECT ... FOR UPDATE + UPDATE-ou-INSERT, NUNCA `ON DUPLICATE KEY UPDATE` (ADR-0020
    // §"Padrão de upsert"). O ODKU dispara em QUALQUER UNIQUE violada, não só na PK: uma remessa
    // NOVA com NSA já usado na conta cairia no ramo de update e SOBRESCREVERIA o status da remessa
    // existente — que pode estar `Transmitted`. O UNIQUE deixaria de recusar, e uma remessa já
    // enviada passaria a constar com o desfecho de outra. Foi exatamente esse defeito que o teste
    // de integração pegou.
    save: async (
      remittance: Remittance,
      events: readonly RemittanceSaveEvent[] = [],
    ): Promise<Result<void, RemittanceSaveError>> => {
      try {
        await db.transaction(async (tx) => {
          // ─── Ordem de aquisição: `fin_payables` ANTES de `fin_remittances` (0031, braço A) ───
          //
          // Não é preferência de estilo — é o que quebra um ciclo medido. A busca abaixo procura a
          // remessa por um id que, na CRIAÇÃO, ainda não existe; busca que não encontra registro
          // não tem o que travar e fica com o VÃO (gap lock no `supremum` da PK). Gap locks
          // coexistem — *"can co-exist (…) do not conflict with each other"* (Refman 8.4 §17.7.1)
          // —, então as duas emissões passavam por ali sem esperar; uma prendia o título que a
          // outra queria, e o `INSERT` da que seguia precisava de insert-intention, que conflita
          // com o gap da primeira. Ciclo fechado: deadlock 1213 em 20/20 rodadas contra MySQL
          // 8.4.11 real (§3.2), com o operador lendo "banco indisponível" numa emissão legítima.
          //
          // Com UMA ordem global entre as duas tabelas não há ciclo: quem chega depois espera no
          // título e só alcança o gap quando o primeiro já commitou. Medido: 0 deadlocks em 15
          // rodadas (§4.2, braço C) — a causalidade que sustenta esta escolha.
          //
          // ⚠️ Trava também no ramo de UPDATE, onde reserva alguma é necessária: é o custo aceito
          // do braço A, e o efeito sob carga NÃO foi medido (`D2` da 0031). Confirmar ou descartar
          // uma remessa passa a travar os títulos dela por instantes. Travar não é recusar — a
          // verificação de hold segue exclusiva da criação, como o port declara.
          //
          // ⚠️ Locking read, jamais `select` puro: um consistent read AQUI fixaria o snapshot da
          // transação antes da corrida, e a releitura lá adiante voltaria a enxergar o estado
          // anterior — as duas emissões gravariam de novo, em silêncio.
          //
          // Ordenar os ids não acrescenta nada — 28 deadlocks em 15 rodadas com `payableIds`
          // ordenados (§4.2, braço B) —, e o motivo está no plano: esta busca vai pela PK, e o
          // lock sai `X,REC_NOT_GAP` sobre exatamente os registros pedidos. Medido com
          // `fin_payables` em 10.242 linhas (*"Covering index range scan (…) using PRIMARY"*,
          // 2 locks de registro, nenhum gap) e confirmado no dump de deadlock com ~60 linhas, que
          // acusa `index PRIMARY`.
          //
          // ⚠️ Só em fixture MÍNIMA (3 linhas) o otimizador prefere `fin_payables_status_idx`, que
          // cobre `SELECT id` por carregar a PK, e aí o lock vira next-key sobre `supremum` mais
          // registros que a query não pediu (§3.8). É medição de caso pequeno, não o comportamento
          // fora dele — e a diferença importa: sem gap, a insert-intention da concorrente não tem
          // com o que conflitar, que é por que o ramo de update não bloqueia INSERT de título novo
          // (20/20 passaram, 0 deadlocks).
          //
          // O guard de lista vazia não é defensivo: `inArray` com `[]` é erro do builder, não
          // predicado falso. Uma remessa sem títulos não existe no domínio, mas o ramo de update
          // chega aqui com o agregado que o chamador montou.
          const payableIds = remittance.payables.map((p) => p.payableId);
          if (payableIds.length > 0) {
            await tx
              .select({ id: finPayables.id })
              .from(finPayables)
              .where(inArray(finPayables.id, payableIds))
              .for('update');
          }

          const existing = await tx
            .select({ id: finRemittances.id })
            .from(finRemittances)
            .where(eq(finRemittances.id, remittance.id))
            .for('update');

          if (existing[0] === undefined) {
            // ─── Reserva dos títulos (#789) ─────────────────────────────────────────────────
            //
            // `findHeldPayables`, no use case, responde sobre o PASSADO: entre a resposta dela e
            // esta transação cabe a tradução CNAB inteira. Duas emissões concorrentes leem "livre"
            // antes de qualquer uma gravar, e ambas gravam — o mesmo título em duas remessas, que é
            // pagamento em dobro (CWE-367). A PK composta `(remittance_id, payable_id)` não recusa:
            // remessas distintas são chaves distintas.
            //
            // A invariante é CONDICIONAL — "não estar em duas remessas VIVAS", com `Discarded`
            // devolvendo o título — e o MySQL não tem índice parcial.
            //
            // ⚠️ Mas isso NÃO significa "nenhuma constraint é possível", como este comentário já
            // afirmou. Exclusão condicional tem forma no MySQL: coluna gerada `STORED` com
            // `CASE … ELSE NULL` mais `UNIQUE` — NULL não viola UNIQUE, então título em remessa
            // morta não conflita. Medido em 8.4.11: a 2ª remessa viva sai com `1062`, as mortas
            // entram em qualquer número, e sob concorrência **sem lock explícito nenhum**.
            //
            // A escolha pelo lock segue de pé, mas o motivo é CUSTO, não impossibilidade: a coluna
            // gerada exige desnormalizar o status da remessa na tabela de vínculo, e como trigger é
            // proibido (ADR-0020) a sincronia passa a depender do TS — trocar-se-ia uma corrida por
            // um dever de consistência espalhado. Registrar isso importa porque uma justificativa
            // falsa fecha a porta para quem, amanhã, precisar reabrir a decisão.
            //
            // O lock sobre `fin_payables` já foi adquirido no TOPO desta transação, antes da busca
            // pela remessa — ver a ordem de aquisição lá, e por que ela é o que impede o ciclo.
            // Aqui só se refaz, sob ele, a pergunta que o use case fez lá atrás.

            // Agora sob lock: a pergunta que o use case fez lá atrás, refeita no mesmo ato da
            // gravação. Quem chegou primeiro já gravou o vínculo e commitou; quem chega depois vê.
            //
            // ⚠️ E vê por um motivo que depende da ORDEM das leituras desta transação, não apenas
            // do lock acima. Esta releitura NÃO trava nada — é *consistent read*, e sob REPEATABLE
            // READ (o isolamento vigente, default do servidor) todos eles leem o snapshot fixado
            // pelo PRIMEIRO deles: *"All consistent reads within the same transaction read the
            // snapshot established by the first such read in that transaction"* (Refman 8.4
            // §17.7.2.3). As duas leituras anteriores são `for('update')` — locking reads, que leem
            // sempre a versão committed mais recente e por isso não são o "first such read" que fixa
            // o snapshot. Logo o primeiro consistent read é ESTE, e ele só executa depois de a trava
            // acima liberar, isto é, depois de o vencedor ter commitado.
            //
            // Para quem for mexer aqui: acrescentar QUALQUER `select` sem `for('update')` ANTES da
            // trava fixa o snapshot cedo, e esta releitura volta a enxergar o estado anterior à
            // corrida — as duas emissões gravam de novo, em silêncio. Uma leitura de auditoria, um
            // `findById` reaproveitado dentro da `tx` ou uma checagem de conta bastam. Se algo
            // precisar ser lido antes, leia com `for('update')`.
            //
            // Sob READ COMMITTED a premissa é dispensável — lá cada consistent read pega snapshot
            // novo. Ou seja, a trava sobrevive à troca de isolamento (como o bloco acima afirma),
            // mas por REPEATABLE READ ela depende também desta ordem. A rede mecânica é o teste
            // `emissão concorrente — a janela TOCTOU (#789)`, que fica vermelho se isto quebrar.
            const heldNow = await tx
              .select({ payableId: finRemittancePayables.payableId })
              .from(finRemittancePayables)
              .innerJoin(finRemittances, eq(finRemittances.id, finRemittancePayables.remittanceId))
              .where(
                and(
                  inArray(finRemittancePayables.payableId, payableIds),
                  inArray(finRemittances.status, [...HOLDING]),
                ),
              );

            // `throw` e não `return`: só a exceção desfaz a transação (o driver roda ROLLBACK no
            // catch e relança). O `catch` externo o reconhece e devolve o `Result` nomeado — a
            // convenção deste repositório, em vez do `tx.rollback()` do doc oficial, que não
            // carregaria qual erro foi.
            if (heldNow.length > 0) throw PAYABLES_ALREADY_HELD;

            // ─── Transição dos títulos (ADR-0065 §2) ────────────────────────────────────────
            //
            // Aqui o título deixa a alçada do core-api. A P.O. decidiu em 24/08 que "transmitido" é
            // um fato NOSSO — a remessa saiu daqui —, e não um fato do banco: o que o banco fez com
            // o arquivo é dado do retorno. É a Anticorruption Layer de Vernon (IDDD p.142) aplicada
            // ao vocabulário, e o ADR-0065 supersede a cláusula do 0060 que atrelava ESTE estado ao
            // sinal externo. O `Transmitted` da REMESSA continua dependendo do `status/` — são dois
            // fatos, e é o §3 do ADR que os separa.
            //
            // CAS pela pré-condição da operação (ADR-0063 §2): a guarda é a cláusula `WHERE`, não um
            // `if` que leu antes e decidiu depois. Não há coluna de versão, e não precisa haver — o
            // estado anterior É a pré-condição.
            //
            // ⚠️ `IN (…) AND status = 'Approved'` é UMA sentença, não N. O ADR escreve o SQL por
            // título; o que ele exige é o CAS e o veredito por contagem, e os dois valem igual em
            // lote. Em lote são menos round-trips DENTRO da transação que decide a corrida — e a
            // linha do `IN` já está travada pelo `FOR UPDATE` do topo, então nenhum lock novo entra.
            // O ADR-0063 proíbe `IN` para ATRIBUIÇÃO (onde ele aceitaria toda escrita e devolveria
            // last-write-wins mudo); aqui é transição, e a contagem é o que a torna exata.
            //
            // Divergiu a contagem, algum título não estava `Approved` — e a transação inteira desfaz,
            // inclusive a reserva. Qual deles falhou não viaja no erro de propósito: o pré-voo
            // (`previewRemittance`) é quem responde isso, ANTES de queimar NSA, e duplicar a resposta
            // aqui criaria uma segunda régua para a mesma pergunta.
            //
            // O NSA já consumido NÃO volta. É a regra vigente do use case, e vale igual neste
            // caminho: gap na sequência é inofensivo, reusar número é retransmissão para o banco.
            //
            // `inArray` com lista vazia é erro do builder, não predicado falso — e não é alcançável
            // aqui: `create` do agregado recusa remessa sem título, e este ramo é só o de criação.
            const transitioned = await tx
              .update(finPayables)
              .set({ status: 'Transmitted' })
              .where(and(inArray(finPayables.id, payableIds), eq(finPayables.status, 'Approved')));

            if (affectedRowsOf(transitioned) !== payableIds.length) throw PAYABLE_NOT_APPROVED;

            // Criação: INSERT puro. Violação de UNIQUE (NSA por conta, nome de arquivo) LANÇA e
            // vira `Result` de erro no catch — que é o comportamento que se quer.
            await tx.insert(finRemittances).values({
              id: remittance.id,
              cedenteAccountId: remittance.cedenteAccountId,
              nsa: remittance.nsa,
              fileName: remittance.fileName,
              contentHash: remittance.contentHash,
              status: remittance.status,
              generatedAt: toMysqlDateTime(remittance.generatedAt),
              settledAt:
                remittance.settledAt === undefined ? null : toMysqlDateTime(remittance.settledAt),
              detail: remittance.detail ?? null,
            });

            // Vínculo é imutável: os documentos de uma remessa não mudam depois de criada, então
            // só são gravados na criação.
            //
            // `yourNumber` (#752) é gravado JUNTO, e não num passo à parte, porque a referência não
            // faz sentido sem o vínculo: um par gravado pela metade seria um documento preso cuja
            // chave de casamento ninguém sabe qual é. A transação já cobre isso.
            for (const { payableId, documentId, yourNumber } of remittance.payables) {
              await tx
                .insert(finRemittancePayables)
                .values({ remittanceId: remittance.id, payableId, documentId, yourNumber });
            }
          } else {
            // Atualização de desfecho, por ID. Só o que a máquina de estados muda — nunca NSA, nome
            // ou hash, que são imutáveis depois de gerada.
            await tx
              .update(finRemittances)
              .set({
                status: remittance.status,
                settledAt:
                  remittance.settledAt === undefined ? null : toMysqlDateTime(remittance.settledAt),
                detail: remittance.detail ?? null,
              })
              .where(eq(finRemittances.id, remittance.id));
          }

          // Estado e evento na MESMA transação (ADR-0015): o evento existe se e somente se o
          // desfecho foi persistido. Anunciar "remessa transmitida" e perder a gravação seria pior
          // que não anunciar — o operador agiria sobre um estado que o banco de dados não tem.
          //
          // No-op quando `events` é vazio, que é o caso da revarredura idempotente: o desfecho já
          // tinha sido anunciado, e reemitir encheria o outbox a cada 5 minutos, para sempre.
          await appendFinOutboxInTx(tx, events);
        });
        return ok(undefined);
      } catch (cause) {
        // Perder a corrida é desfecho ESPERADO sob concorrência, não avaria: sai com nome próprio e
        // sem poluir o stderr, para que o log siga significando "algo quebrou". Vale igual para a
        // transição recusada: título que deixou de ser `Approved` entre o pré-voo e a gravação é
        // conflito legítimo, não falha de infraestrutura.
        if (cause === PAYABLES_ALREADY_HELD) return err('remittance-payables-already-held');
        if (cause === PAYABLE_NOT_APPROVED) return err('remittance-payable-not-approved');
        logRepo('save', cause);
        return err('remittance-repository-unavailable');
      }
    },

    findById: async (id): Promise<Result<Remittance | null, RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.id, id))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row, await loadPayables(row.id));
        if (!mapped.ok) {
          logRepo('findById:map', mapped.error);
          return err('remittance-repository-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logRepo('findById', cause);
        return err('remittance-repository-unavailable');
      }
    },

    findByFileName: async (
      fileName: string,
    ): Promise<Result<Remittance | null, RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.fileName, fileName))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row, await loadPayables(row.id));
        if (!mapped.ok) {
          logRepo('findByFileName:map', mapped.error);
          return err('remittance-repository-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logRepo('findByFileName', cause);
        return err('remittance-repository-unavailable');
      }
    },

    // JOIN no banco, não filtro em memória: outra instância pode ter enfileirado o mesmo título
    // há dois segundos, e uma resposta desatualizada aqui custa pagamento em dobro.
    //
    // ⚠️ Pergunta por TÍTULO. Filtrar por documento prenderia os irmãos junto: com o pai numa
    // remessa viva, a retenção da mesma nota apareceria como presa e o operador não conseguiria
    // pagá-la — o oposto da premissa de que cada título tem ciclo de vida próprio.
    findHeldPayables: async (
      payableIds: readonly string[],
    ): Promise<Result<readonly HeldPayable[], RemittanceRepositoryError>> => {
      if (payableIds.length === 0) return ok([]);

      try {
        // O `innerJoin` já existia para filtrar por status; `nsa` e `remittanceId` só entram na
        // projeção. Nenhuma junção nova, nenhum índice a mais.
        const rows = await db
          .select({
            payableId: finRemittancePayables.payableId,
            remittanceId: finRemittances.id,
            nsa: finRemittances.nsa,
          })
          .from(finRemittancePayables)
          .innerJoin(finRemittances, eq(finRemittances.id, finRemittancePayables.remittanceId))
          .where(
            and(
              inArray(finRemittancePayables.payableId, [...payableIds]),
              inArray(finRemittances.status, [...HOLDING]),
            ),
          );

        // Ordem estável por título: a resposta alimenta mensagem ao operador e assert de teste, e
        // ordem de linha do MySQL sem `ORDER BY` não é contrato. A deduplicação de antes some de
        // propósito — o mesmo título em duas remessas vivas é o defeito que #789 existe para
        // detectar, e colapsar as linhas aqui o esconderia.
        return ok([...rows].sort((a, b) => a.payableId.localeCompare(b.payableId)));
      } catch (cause) {
        logRepo('findHeldPayables', cause);
        return err('remittance-repository-unavailable');
      }
    },

    listByStatus: async (
      status: RemittanceStatus,
    ): Promise<Result<readonly Remittance[], RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.status, status));
        const out: Remittance[] = [];

        for (const row of rows) {
          const mapped = toDomain(row, await loadPayables(row.id));
          if (!mapped.ok) {
            logRepo('listByStatus:map', mapped.error);
            return err('remittance-repository-unavailable');
          }
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('listByStatus', cause);
        return err('remittance-repository-unavailable');
      }
    },

    // #728: página de acompanhamento. Um COUNT para o total; um SELECT ordenado por `generatedAt`
    // DESC (desempate por id desc, estável) com limit/offset; e os documentIds da página em UMA
    // query batch (`WHERE remittance_id IN (ids)`) agrupada num Map — evita o N+1 de chamar
    // `loadDocumentIds` por linha.
    listPaged: async (
      pagination: Readonly<{ limit: number; offset: number }>,
    ): Promise<
      Result<Readonly<{ items: readonly Remittance[]; total: number }>, RemittanceRepositoryError>
    > => {
      try {
        const totalRows = await db.select({ n: sql<number>`count(*)` }).from(finRemittances);
        const total = totalRows[0]?.n ?? 0;

        const rows = await db
          .select()
          .from(finRemittances)
          .orderBy(desc(finRemittances.generatedAt), desc(finRemittances.id))
          .limit(pagination.limit)
          .offset(pagination.offset);

        // Vínculos da página inteira numa consulta só — depois agrupados por remessa.
        const ids = rows.map((r) => r.id);
        const linkRows =
          ids.length === 0
            ? []
            : await db
                .select({
                  remittanceId: finRemittancePayables.remittanceId,
                  payableId: finRemittancePayables.payableId,
                  documentId: finRemittancePayables.documentId,
                  yourNumber: finRemittancePayables.yourNumber,
                })
                .from(finRemittancePayables)
                .where(inArray(finRemittancePayables.remittanceId, ids));

        const payablesByRemittance = new Map<string, RemittancePayable[]>();
        for (const link of linkRows) {
          const payable = {
            payableId: link.payableId,
            documentId: link.documentId,
            yourNumber: link.yourNumber,
          };
          const bucket = payablesByRemittance.get(link.remittanceId);
          if (bucket === undefined) {
            payablesByRemittance.set(link.remittanceId, [payable]);
          } else {
            bucket.push(payable);
          }
        }

        const items: Remittance[] = [];
        for (const row of rows) {
          const payables = (payablesByRemittance.get(row.id) ?? []).sort((a, b) =>
            a.payableId.localeCompare(b.payableId),
          );
          const mapped = toDomain(row, payables);
          if (!mapped.ok) {
            logRepo('listPaged:map', mapped.error);
            return err('remittance-repository-unavailable');
          }
          items.push(mapped.value);
        }
        return ok({ items, total });
      } catch (cause) {
        logRepo('listPaged', cause);
        return err('remittance-repository-unavailable');
      }
    },
  };
};
