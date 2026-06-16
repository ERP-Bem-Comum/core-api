package main

import (
	"errors"
	"os"
	"strconv"
)

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// S3Config — MESMA convenção do core-api (ADR-0019, document-storage.s3.ts): endpoint
// custom + path-style para MinIO (dev) / R2 / Magalu. Reusa as env vars já existentes.
type S3Config struct {
	Endpoint        string // S3_ENDPOINT (ex.: http://minio:9000)
	Region          string // S3_REGION
	AccessKeyID     string // S3_ACCESS_KEY_ID
	SecretAccessKey string // S3_SECRET_ACCESS_KEY
	Bucket          string // S3_BUCKET
	ForcePathStyle  bool   // S3_FORCE_PATH_STYLE (true p/ MinIO)
}

// DispatchConfig — plano "suspensório" (repository_dispatch → GitHub Actions de ingestão).
type DispatchConfig struct {
	Repo  string // DEADMAN_DISPATCH_REPO (owner/repo)
	Token string // DEADMAN_DISPATCH_TOKEN (PAT com escopo de dispatch)
	Event string // DEADMAN_DISPATCH_EVENT (event_type)
}

type Config struct {
	Emitter  string
	Key      []byte
	Seq      int64
	Kind     string
	S3       S3Config
	Dispatch DispatchConfig
}

// HasS3 / HasDispatch — cada plano do dual-write é best-effort e independente: o que
// estiver configurado é tentado. Pelo menos um é exigido (validado em LoadConfig).
func (c Config) HasS3() bool {
	return c.S3.Endpoint != "" && c.S3.Bucket != "" && c.S3.AccessKeyID != "" && c.S3.SecretAccessKey != ""
}
func (c Config) HasDispatch() bool { return c.Dispatch.Repo != "" && c.Dispatch.Token != "" }

// ObjectKey — caminho do ping no Object Storage (decisão (a): 1 objeto por ping).
func (c Config) ObjectKey() string {
	return "status/" + c.Emitter + "/" + strconv.FormatInt(c.Seq, 10) + ".jsonl"
}

func LoadConfig() (Config, error) {
	emitter := os.Getenv("DEADMAN_EMITTER")
	key := os.Getenv("DEADMAN_HMAC_KEY")
	if emitter == "" || key == "" {
		return Config{}, errors.New("DEADMAN_EMITTER e DEADMAN_HMAC_KEY são obrigatórios")
	}
	seq, err := strconv.ParseInt(getenv("DEADMAN_SEQ", "0"), 10, 64)
	if err != nil || seq < 0 {
		return Config{}, errors.New("DEADMAN_SEQ inválido (inteiro ≥ 0)")
	}
	forcePathStyle, _ := strconv.ParseBool(os.Getenv("S3_FORCE_PATH_STYLE"))

	cfg := Config{
		Emitter: emitter,
		Key:     []byte(key),
		Seq:     seq,
		Kind:    getenv("DEADMAN_KIND", KindPing),
		S3: S3Config{
			Endpoint:        os.Getenv("S3_ENDPOINT"),
			Region:          getenv("S3_REGION", "us-east-1"),
			AccessKeyID:     os.Getenv("S3_ACCESS_KEY_ID"),
			SecretAccessKey: os.Getenv("S3_SECRET_ACCESS_KEY"),
			Bucket:          os.Getenv("S3_BUCKET"),
			ForcePathStyle:  forcePathStyle,
		},
		Dispatch: DispatchConfig{
			Repo:  os.Getenv("DEADMAN_DISPATCH_REPO"),
			Token: os.Getenv("DEADMAN_DISPATCH_TOKEN"),
			Event: getenv("DEADMAN_DISPATCH_EVENT", "deadman-ping"),
		},
	}
	if !cfg.HasS3() && !cfg.HasDispatch() {
		return Config{}, errors.New("configure ao menos um plano: S3_* (status objects) e/ou DEADMAN_DISPATCH_* (webhook)")
	}
	return cfg, nil
}
