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

set_index_cache_policy() {
	local bucket="$1"
	local app="$2"
	aws s3 cp "artifacts/${app}/dist/public/index.html" "s3://${bucket}/index.html" \
		--cache-control "no-cache, no-store, must-revalidate" \
		--content-type "text/html; charset=utf-8"
}

invalidate_distribution() {
	local distribution_id="$1"
	local app="$2"
	if [[ -n "$distribution_id" ]]; then
		echo "  -> Invalidating CloudFront cache for ${app} (${distribution_id})..."
		aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths '/*' >/dev/null
	fi
}

: "${CF_DIST_SAIVIE:=E1LS981L0SUTE8}"

echo "  -> Syncing @workspace/saivie to s3://saivie-app..."
aws s3 sync artifacts/saivie/dist/public s3://saivie-app --delete
set_index_cache_policy saivie-app saivie

echo "  -> Syncing @workspace/saivie-desk to s3://saivie-desk..."
aws s3 sync artifacts/saivie-desk/dist/public s3://saivie-desk --delete
set_index_cache_policy saivie-desk saivie-desk

echo "  -> Syncing @workspace/saivie-recover to s3://saivie-recover..."
aws s3 sync artifacts/saivie-recover/dist/public s3://saivie-recover --delete
set_index_cache_policy saivie-recover saivie-recover

echo "  -> Syncing @workspace/saiviegene to s3://saivie-gene..."
aws s3 sync artifacts/saiviegene/dist/public s3://saivie-gene --delete
set_index_cache_policy saivie-gene saiviegene

invalidate_distribution "$CF_DIST_SAIVIE" Saivie
invalidate_distribution "${CF_DIST_DESK:-}" Desk
invalidate_distribution "${CF_DIST_RECOVER:-}" Recover
invalidate_distribution "${CF_DIST_GENE:-}" Gene

echo ""
echo "======================================================"
echo "  ✓ All 4 web frontends deployed successfully to AWS S3!"
echo "======================================================"
