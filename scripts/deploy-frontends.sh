#!/usr/bin/env bash
set -euo pipefail

echo "======================================================"
echo "  Deploying Web Frontends to AWS S3"
echo "======================================================"
echo ""

# 1. Build all web frontends
echo "[1/2] Building web applications..."
pnpm -r --filter "!@workspace/mamacare-mobile" --if-present run build

# 2. Sync builds to AWS S3 buckets
echo ""
echo "[2/2] Syncing static builds to AWS S3 buckets..."

echo "  -> Syncing @workspace/saivie to s3://saivie-app..."
aws s3 sync artifacts/saivie/dist/public s3://saivie-app --delete

echo "  -> Syncing @workspace/saivie-desk to s3://saivie-desk..."
aws s3 sync artifacts/saivie-desk/dist/public s3://saivie-desk --delete

echo "  -> Syncing @workspace/saivie-recover to s3://saivie-recover..."
aws s3 sync artifacts/saivie-recover/dist/public s3://saivie-recover --delete

echo "  -> Syncing @workspace/saiviegene to s3://saivie-gene..."
aws s3 sync artifacts/saiviegene/dist/public s3://saivie-gene --delete

echo ""
echo "======================================================"
echo "  ✓ All 4 web frontends deployed successfully to AWS S3!"
echo "======================================================"
