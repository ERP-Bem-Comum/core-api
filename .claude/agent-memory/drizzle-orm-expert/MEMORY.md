# Memory Index

- [Clock fixo em testes](feedback_clock_fixed_in_tests.md) — Usar ClockFixed de src/shared/adapters/clock-fixed.ts; nunca construir objeto literal com today() raw (PlainDate é branded)
- [Drizzle UserRepo entregue](project_auth_db_repo_user_delivered.md) — AUTH-DB-REPO-USER W1b entregue; padrão isEmailDupEntry, 3 queries Q1/Q2/Q3, upsert SELECT-FOR-UPDATE
- [CTR-AUTO-EXPIRE decisão de lock](project_ctr_auto_expire_lock_decision.md) — findExpirable usa SELECT simples (sem FOR UPDATE): runSweep tem 2 tx separadas; lock não persiste entre elas; multi-instância é F-Plus (ADR-0041)
- [PAR-COLLAB-FOODCAT-LENGTH W0](project_par_collab_foodcat_length.md) — food_category varchar(20) < 21-char 'PREFIRO_NAO_RESPONDER'; W0 RED entregue; W1 = ALTER varchar(30) INPLACE
- [FOR UPDATE e errno em e.cause](reference_for_update_and_error_propagation.md) — ADR-0020 não cita FOR UPDATE (só precedente); errno de deadlock/lock-timeout mora em e.cause.errno
