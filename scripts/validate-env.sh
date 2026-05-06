#!/usr/bin/env sh
set -eu

if [ "${READ_ONLY_MODE:-true}" != "true" ]; then
  echo "READ_ONLY_MODE must be true for the demo safety model." >&2
  exit 1
fi

node -e "const v=process.version; if(Number(v.slice(1).split('.')[0])<18){process.exit(1)}"
echo "Environment validation passed."
