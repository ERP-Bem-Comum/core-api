# Memory Index

- [Shutdown idempotency pattern](feedback_shutdown_idempotency_pattern.md) — makeShutdownOnce extraído para módulo testável; validado em CTR-DEVOPS-HARDENING
- [last-resort stack trace fix](feedback_last_resort_stack_trace.md) — String(cause) perde stack; usar cause instanceof Error ? cause.stack : String(cause)
- [ESLint OOM por worktrees não excluídos](project_eslint_worktrees_oom.md) — .claude/worktrees/ (~1748 .ts) não está nos ignores do flat config, triplicando o programa TS do projectService
