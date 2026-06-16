// Entrypoint do Emissor (one-shot por disparo — combina com cron, igual ao sweeper).
// Config 12-factor via env (config.go). Exit codes sysexits.h (0 ok · 78 EX_CONFIG · 1 runtime).
//
// Dual-write (decisão (a) — contratos doc 07): o ping é PUT como 1 objeto em
// `status/<emitter>/<seq>.jsonl` (S3/R2) E disparado via `repository_dispatch` ao GitHub.
// Cada plano é BEST-EFFORT e independente: a falha de um não aborta o outro (a razão da
// redundância). Sai 1 só se NENHUM plano teve sucesso.
package main

import (
	"fmt"
	"os"
	"time"
)

const exConfig = 78 // sysexits.h — configuração inválida.

func main() {
	cfg, err := LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[emitter] config inválida: %v\n", err)
		os.Exit(exConfig)
	}

	signed, err := NewPing(cfg.Emitter, cfg.Seq, cfg.Kind, time.Now()).Signed(cfg.Key)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[emitter] erro ao assinar ping: %v\n", err)
		os.Exit(1)
	}
	line, err := signed.JSONL()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[emitter] erro ao serializar ping: %v\n", err)
		os.Exit(1)
	}

	ok := 0
	if cfg.HasS3() {
		if err := cfg.S3.PutObject(cfg.ObjectKey(), []byte(line), time.Now()); err != nil {
			fmt.Fprintf(os.Stderr, "[emitter] S3 PUT falhou: %v\n", err)
		} else {
			fmt.Fprintf(os.Stderr, "[emitter] S3 PUT ok: %s\n", cfg.ObjectKey())
			ok++
		}
	}
	if cfg.HasDispatch() {
		if err := cfg.Dispatch.Send(signed); err != nil {
			fmt.Fprintf(os.Stderr, "[emitter] dispatch falhou: %v\n", err)
		} else {
			fmt.Fprintln(os.Stderr, "[emitter] dispatch ok")
			ok++
		}
	}

	fmt.Print(line) // stdout: a linha emitida (observabilidade)
	if ok == 0 {
		fmt.Fprintln(os.Stderr, "[emitter] NENHUM plano teve sucesso")
		os.Exit(1)
	}
}
