package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Send dispara um repository_dispatch (plano "suspensório") com o ping ASSINADO no
// client_payload — o workflow de ingestão (GitHub Actions) o registra em history.jsonl.
// GitHub responde 204 No Content em sucesso.
func (d DispatchConfig) Send(signed Ping) error {
	body, err := json.Marshal(struct {
		EventType     string `json:"event_type"`
		ClientPayload Ping   `json:"client_payload"`
	}{d.Event, signed})
	if err != nil {
		return fmt.Errorf("marshal dispatch: %w", err)
	}

	url := "https://api.github.com/repos/" + d.Repo + "/dispatches"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+d.Token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("repository_dispatch: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("repository_dispatch: status %d: %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	return nil
}
