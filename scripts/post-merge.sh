#!/bin/bash
set -e
pnpm install --frozen-lockfile
echo "" | pnpm --filter @workspace/db run push-force
