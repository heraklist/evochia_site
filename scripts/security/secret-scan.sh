#!/usr/bin/env bash

set -euo pipefail

readonly TRUFFLEHOG_IMAGE='ghcr.io/trufflesecurity/trufflehog@sha256:b8acd9f7306d832b1f16e06003dac2283a737817954554111683ab7a56e9e539'
readonly SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly REPOSITORY_ROOT="$(git -C "${SCRIPT_DIR}/../.." rev-parse --show-toplevel)"

if ! docker info >/dev/null 2>&1; then
  echo 'Docker is unavailable; refusing to skip the blocking secret scan.' >&2
  exit 1
fi

# The checkout is mounted read-only. TruffleHog receives only an isolated tmpfs
# for cloning and scan state, and the immutable image cannot update itself.
exec env MSYS_NO_PATHCONV=1 docker run \
  --rm \
  --platform linux/amd64 \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,mode=1777,size=512m \
  --volume "${REPOSITORY_ROOT}:/repo:ro" \
  "${TRUFFLEHOG_IMAGE}" \
  git file:///repo \
  --no-update \
  --no-color \
  --results=verified,unknown \
  --fail \
  --fail-on-scan-errors
