#!/usr/bin/env sh
set -eu

SCENARIO="${SCENARIO:-malformed-json}" npm run start:watchdog
