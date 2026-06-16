// Núcleo do Emissor do dead-man's switch (ADR-0042 D1: Go).
// Contratos de dados: handbook/infrastructure/07-deadman-switch-data-contracts.md.
//
// Puro/determinístico: monta uma linha de `status.jsonl` e a assina por HMAC-SHA256
// sobre a forma CANÔNICA (campos ordenados, sem `sig`) — o Auditor recomputa o mesmo
// digest para rejeitar pings forjados (anti-spoof).
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

// SchemaVersion é o `v` de cada linha JSONL (forward-compat por linha).
const SchemaVersion = 1

// tsLayout — ISO-8601 UTC com milissegundos e `Z` (ex.: 2026-06-16T03:05:00.000Z).
const tsLayout = "2006-01-02T15:04:05.000Z07:00"

// Kind* — valores válidos de `kind` (contratos §1).
const (
	KindPing = "ping" // sinal de rotina
	KindBoot = "boot" // 1º sinal após reinício do emissor (não reseta seq)
)

// Ping é uma linha de status.jsonl.
type Ping struct {
	V       int    `json:"v"`
	TS      string `json:"ts"`
	Emitter string `json:"emitter"`
	Seq     int64  `json:"seq"`
	Kind    string `json:"kind"`
	Sig     string `json:"sig,omitempty"`
}

// NewPing carimba um ping no instante `now` (normalizado para UTC).
func NewPing(emitter string, seq int64, kind string, now time.Time) Ping {
	return Ping{
		V:       SchemaVersion,
		TS:      now.UTC().Format(tsLayout),
		Emitter: emitter,
		Seq:     seq,
		Kind:    kind,
	}
}

// canonical serializa os campos numa ordem FIXA e SEM `sig`, base do HMAC.
// Emissor e Auditor precisam computar bytes idênticos — por isso a struct dedicada
// (a ordem de campos em Go é estável, mas tornamos explícita e independente de `Sig`).
func (p Ping) canonical() ([]byte, error) {
	return json.Marshal(struct {
		Emitter string `json:"emitter"`
		Kind    string `json:"kind"`
		Seq     int64  `json:"seq"`
		TS      string `json:"ts"`
		V       int    `json:"v"`
	}{p.Emitter, p.Kind, p.Seq, p.TS, p.V})
}

// Sign devolve o HMAC-SHA256 (hex) da forma canônica.
func (p Ping) Sign(key []byte) (string, error) {
	c, err := p.canonical()
	if err != nil {
		return "", fmt.Errorf("canonical: %w", err)
	}
	mac := hmac.New(sha256.New, key)
	mac.Write(c)
	return hex.EncodeToString(mac.Sum(nil)), nil
}

// Line devolve a linha JSONL pronta para append (assinada, terminada em '\n').
func (p Ping) Line(key []byte) (string, error) {
	sig, err := p.Sign(key)
	if err != nil {
		return "", err
	}
	signed := p
	signed.Sig = sig
	b, err := json.Marshal(signed)
	if err != nil {
		return "", fmt.Errorf("marshal ping: %w", err)
	}
	return string(b) + "\n", nil
}

// Verify confere a assinatura (consumido pelo Auditor). Usa hmac.Equal (constante).
func (p Ping) Verify(key []byte) bool {
	want, err := p.Sign(key)
	if err != nil {
		return false
	}
	return hmac.Equal([]byte(want), []byte(p.Sig))
}
