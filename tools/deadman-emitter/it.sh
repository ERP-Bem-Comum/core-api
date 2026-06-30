#!/usr/bin/env bash
# Integração do Emissor contra MinIO local — prova o SigV4 PUT end-to-end
# (PUT 2xx = assinatura válida; secret errado = 403). Sobe/derruba o MinIO do compose.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

docker compose -f "$ROOT/compose.yaml" up -d minio --wait
# minio/mc tem ENTRYPOINT=mc — sobrescreve p/ sh para encadear alias + mb.
docker run --rm --network core-api --entrypoint sh minio/mc -c \
  "mc alias set m http://minio:9000 dev-access-key dev-secret-key-min-8-chars && mc mb --ignore-existing m/deadman"

rc=0
(
  cd "$ROOT/tools/deadman-emitter" &&
    S3_ENDPOINT=http://localhost:9000 \
    S3_ACCESS_KEY_ID=dev-access-key \
    S3_SECRET_ACCESS_KEY=dev-secret-key-min-8-chars \
    S3_BUCKET=deadman \
    S3_FORCE_PATH_STYLE=true \
    S3_REGION=us-east-1 \
    DEADMAN_S3_INTEGRATION=1 \
    go test -run TestPutObject_Integration -v
) || rc=$?

docker compose -f "$ROOT/compose.yaml" down >/dev/null 2>&1 || true
exit "$rc"
