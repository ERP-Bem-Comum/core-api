package main

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

var fixedNow = time.Date(2026, 6, 16, 3, 5, 0, 0, time.UTC)

const testKey = "test-hmac-key-not-for-prod"

func TestNewPing_Fields(t *testing.T) {
	p := NewPing("sweeper-vps-qa", 4211, KindPing, fixedNow)
	if p.V != SchemaVersion {
		t.Fatalf("v = %d, quer %d", p.V, SchemaVersion)
	}
	if p.TS != "2026-06-16T03:05:00.000Z" {
		t.Fatalf("ts = %q, quer ISO-8601 UTC Z", p.TS)
	}
	if p.Emitter != "sweeper-vps-qa" || p.Seq != 4211 || p.Kind != KindPing {
		t.Fatalf("campos errados: %+v", p)
	}
}

func TestSign_Deterministic(t *testing.T) {
	p := NewPing("e", 1, KindPing, fixedNow)
	a, _ := p.Sign([]byte(testKey))
	b, _ := p.Sign([]byte(testKey))
	if a == "" || a != b {
		t.Fatalf("sign não-determinístico: %q vs %q", a, b)
	}
	// chave diferente → assinatura diferente
	c, _ := p.Sign([]byte("outra-chave"))
	if a == c {
		t.Fatal("assinatura igual com chave diferente")
	}
}

func TestCanonical_ExcludesSig(t *testing.T) {
	// O `sig` NÃO entra no canonical → assinar uma ping já-assinada dá o mesmo digest.
	p := NewPing("e", 7, KindPing, fixedNow)
	base, _ := p.Sign([]byte(testKey))
	p.Sig = "lixo-aqui"
	again, _ := p.Sign([]byte(testKey))
	if base != again {
		t.Fatalf("canonical incluiu sig: %q != %q", base, again)
	}
}

func TestLine_IsValidJSONL(t *testing.T) {
	line, err := NewPing("e", 4212, KindBoot, fixedNow).Line([]byte(testKey))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(line, "\n") {
		t.Fatal("linha JSONL deve terminar em \\n")
	}
	if strings.Count(line, "\n") != 1 {
		t.Fatal("linha JSONL deve ter exatamente um \\n")
	}
	var p Ping
	if err := json.Unmarshal([]byte(strings.TrimRight(line, "\n")), &p); err != nil {
		t.Fatalf("linha não é JSON válido: %v", err)
	}
	if p.Sig == "" {
		t.Fatal("linha deve conter sig")
	}
}

func TestVerify_RoundTripAndTamper(t *testing.T) {
	key := []byte(testKey)
	line, _ := NewPing("e", 99, KindPing, fixedNow).Line(key)
	var p Ping
	_ = json.Unmarshal([]byte(strings.TrimRight(line, "\n")), &p)

	if !p.Verify(key) {
		t.Fatal("ping legítima deveria verificar")
	}
	if p.Verify([]byte("chave-errada")) {
		t.Fatal("chave errada não deveria verificar")
	}
	// adulterar o seq invalida a assinatura
	tampered := p
	tampered.Seq = 100
	if tampered.Verify(key) {
		t.Fatal("ping adulterada (seq) não deveria verificar")
	}
}
