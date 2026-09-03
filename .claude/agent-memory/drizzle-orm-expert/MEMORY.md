# Memory Index

- [Clock fixo em testes](feedback_clock_fixed_in_tests.md) — Usar ClockFixed de src/shared/adapters/clock-fixed.ts; nunca construir objeto literal com today() raw (PlainDate é branded)
- [Drizzle UserRepo entregue](project_auth_db_repo_user_delivered.md) — AUTH-DB-REPO-USER W1b entregue; padrão isEmailDupEntry, 3 queries Q1/Q2/Q3, upsert SELECT-FOR-UPDATE
- [CTR-AUTO-EXPIRE decisão de lock](project_ctr_auto_expire_lock_decision.md) — findExpirable usa SELECT simples (sem FOR UPDATE): runSweep tem 2 tx separadas; lock não persiste entre elas; multi-instância é F-Plus (ADR-0041)
- [PAR-COLLAB-FOODCAT-LENGTH W0](project_par_collab_foodcat_length.md) — food_category varchar(20) < 21-char 'PREFIRO_NAO_RESPONDER'; W0 RED entregue; W1 = ALTER varchar(30) INPLACE
- [Outbox fanout por consumidor #800/#824](project_outbox_fanout_consumer_id.md) — modelo canônico partners; divergências no financial (sem in-memory worker) e na DLQ do fin_outbox; resultado final dos 6+13 arquivos
- [markFailed virou OutboxFailure](reference_eslint_max_params_arrow_report_line.md) — max-params resolvido com objeto `{now,errorTag,attempt}`, não eslint-disable (team-lead rejeitou a supressão)
- [Adequar teste ≠ afrouxar (outbox fanout)](feedback_outbox_fanout_test_adequacy.md) — trocar a FONTE do dado (eventos_processados/progress), não só o argumento; moveToDeadLetter não deleta mais
- [SQL | undefined em WHERE-builder](reference_sql_or_undefined_where_predicate.md) — `and(...) as SQL`/`!` colidem entre duas regras de lint; retornar `SQL | undefined` sem cast é o idioma certo
- [FOR UPDATE e errno em e.cause](reference_for_update_and_error_propagation.md) — ADR-0020 não cita FOR UPDATE (só precedente); errno de deadlock/lock-timeout mora em e.cause.errno
- [Erro e transação no Drizzle 0.45.2](reference_drizzle_error_and_tx_semantics.md) — errno em `.cause` profundidade 1 p/ TODA query (não só db.execute); tx faz rollback+release, sem retry; `values([])` é erro do builder
- [Document hard replace vs ordem de lock](project_fin_document_hard_replace_lock_order.md) — child-rows-diff JÁ cobre fin_payables; diff de linha não fecha deadlock de ORDEM contra fin_remittance_payables
- [Bash cwd cruza worktree](feedback_bash_cwd_resets_across_worktrees.md) — ⚠️ path relativo em Bash pode ler OUTRO worktree; usar `git -C`/absoluto sempre em revisão multi-agente
- [Custo medido de mudar o schema](reference_schema_change_cost_measured.md) — cascata para em 2 arquivos; format:check reprova por JSON do drizzle-kit; 86/88 fakes são cegos ao schema
- [NOT NULL + CHECK = 2 statements](reference_notnull_check_ddl_two_statements.md) — sem DEFAULT nem aviso; em tabela com linhas o CHECK falha 3819 e a migration fica pela metade
- [Extrair schema.sql consolidado](reference_schema_sql_extraction_toolkit.md) — `drizzle-kit export --dialect=mysql --sql` funciona e é determinístico; `--out` absoluto quebra; ENGINE= é sempre edição manual
- [Atlas lê o diretório do Drizzle](reference_atlas_reads_drizzle_dir.md) — `--dir-format` NÃO é o obstáculo; 🚨 mas `migrate lint` é **Atlas Pro desde a v0.38** — o gate viável é o replay num MySQL limpo (~64 s), que não depende do Atlas
