#!/usr/bin/env bash
# Copies the canonical API error fixtures from daml-escrow-commons (the Go
# source of truth) into test/fixtures/api-error, and records the commit
# they came from in SOURCE -- CI checks the copies still match that commit.
#
#   scripts/sync-api-error-fixtures.sh [path-to-daml-escrow-commons]
set -euo pipefail
src="${1:-../daml-escrow-commons}"
dst="$(cd "$(dirname "$0")/.." && pwd)/test/fixtures/api-error"
rm -rf "$dst"
mkdir -p "$dst/canonical" "$dst/logfields" "$dst/classify"
cp "$src"/apierror/testdata/canonical/*.json "$dst/canonical/"
cp "$src"/apierror/testdata/logfields/*.json "$dst/logfields/"
cp "$src"/apierror/canton/testdata/classify/*.json "$dst/classify/"
cp "$src"/apierror/schema/error.schema.json "$dst/error.schema.json"
# The schema also ships in the package (exported as ./schema/api-error.json).
mkdir -p "$dst/../../../src/schema"
cp "$src"/apierror/schema/error.schema.json "$dst/../../../src/schema/api-error.schema.json"
git -C "$src" rev-parse HEAD > "$dst/SOURCE"
echo "synced api-error fixtures from $(cat "$dst/SOURCE")"
