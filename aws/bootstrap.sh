#!/usr/bin/env bash
# aws/bootstrap.sh — One-shot AWS infrastructure setup for Saivie
#
# Run once from your local machine:
#   chmod +x aws/bootstrap.sh
#   ./aws/bootstrap.sh
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure, or env vars)
#   - Sufficient IAM permissions (AdministratorAccess or equivalent)
#   - The ECS cluster "saivie-cluster" already exists (you created this in console)

set -euo pipefail

ACCOUNT_ID="599526348275"
REGION="ap-south-1"
CLUSTER="saivie-cluster"
SERVICE="saivie-api-service"
TASK_FAMILY="saivie-api"
ECR_REPO="saivie-api"
EXEC_ROLE="saivie-ecs-execution-role"
TASK_ROLE="saivie-ecs-task-role"

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }

echo ""
echo "======================================================"
echo "  Saivie AWS Bootstrap  (account: $ACCOUNT_ID, $REGION)"
echo "======================================================"
echo ""

# ── 1. IAM — ECS Execution Role ───────────────────────────────────────────────
info "Creating IAM execution role: $EXEC_ROLE"

EXEC_TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ecs-tasks.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}'

if aws iam get-role --role-name "$EXEC_ROLE" &>/dev/null; then
  warn "$EXEC_ROLE already exists — skipping create"
else
  aws iam create-role \
    --role-name "$EXEC_ROLE" \
    --assume-role-policy-document "$EXEC_TRUST_POLICY" \
    --description "ECS task execution role for Saivie API" \
    --region "$REGION" > /dev/null
  info "Created $EXEC_ROLE"
fi

# Attach AWS-managed execution policy
aws iam attach-role-policy \
  --role-name "$EXEC_ROLE" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"

# Inline policy: allow reading Saivie secrets from Secrets Manager
EXEC_INLINE_POLICY="{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Effect\": \"Allow\",
    \"Action\": [
      \"secretsmanager:GetSecretValue\",
      \"secretsmanager:DescribeSecret\"
    ],
    \"Resource\": \"arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:saivie/prod/*\"
  }]
}"

aws iam put-role-policy \
  --role-name "$EXEC_ROLE" \
  --policy-name "saivie-secrets-read" \
  --policy-document "$EXEC_INLINE_POLICY"
info "Attached policies to $EXEC_ROLE"


# ── 2. IAM — ECS Task Role ────────────────────────────────────────────────────
info "Creating IAM task role: $TASK_ROLE"

TASK_TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ecs-tasks.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}'

if aws iam get-role --role-name "$TASK_ROLE" &>/dev/null; then
  warn "$TASK_ROLE already exists — skipping create"
else
  aws iam create-role \
    --role-name "$TASK_ROLE" \
    --assume-role-policy-document "$TASK_TRUST_POLICY" \
    --description "ECS task role for Saivie API (app-level AWS access)" \
    --region "$REGION" > /dev/null
  info "Created $TASK_ROLE"
fi

# Inline policy: S3 access for genome file uploads + CloudWatch logs
TASK_INLINE_POLICY="{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Effect\": \"Allow\",
      \"Action\": [
        \"s3:GetObject\",
        \"s3:PutObject\",
        \"s3:DeleteObject\",
        \"s3:ListBucket\"
      ],
      \"Resource\": [
        \"arn:aws:s3:::saivie-uploads\",
        \"arn:aws:s3:::saivie-uploads/*\"
      ]
    },
    {
      \"Effect\": \"Allow\",
      \"Action\": [
        \"logs:CreateLogStream\",
        \"logs:PutLogEvents\"
      ],
      \"Resource\": \"arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/ecs/saivie-api:*\"
    }
  ]
}"

aws iam put-role-policy \
  --role-name "$TASK_ROLE" \
  --policy-name "saivie-task-permissions" \
  --policy-document "$TASK_INLINE_POLICY"
info "Attached policies to $TASK_ROLE"


# ── 3. Secrets Manager ───────────────────────────────────────────────────────
echo ""
echo "------------------------------------------------------"
echo "  Secrets Manager setup"
echo "  You will be prompted only for required values."
echo "  WhatsApp secrets are parked with placeholders for now."
echo "------------------------------------------------------"
echo ""

# Store a secret — prompts user if $3 is not supplied
create_secret_interactive() {
  local name="$1"
  local prompt="$2"
  local full_name="saivie/prod/${name}"

  if aws secretsmanager describe-secret --secret-id "$full_name" --region "$REGION" &>/dev/null; then
    warn "$full_name already exists — skipping"
    return
  fi

  echo -n "  $prompt: "
  read -r value
  if [ -z "$value" ]; then
    warn "Skipped $full_name — update it later in the console"
    return
  fi

  aws secretsmanager create-secret \
    --name "$full_name" \
    --secret-string "$value" \
    --region "$REGION" > /dev/null
  info "Created $full_name"
}

# Store a secret silently with a fixed value (no prompt)
create_secret_silent() {
  local name="$1"
  local value="$2"
  local full_name="saivie/prod/${name}"

  if aws secretsmanager describe-secret --secret-id "$full_name" --region "$REGION" &>/dev/null; then
    warn "$full_name already exists — skipping"
    return
  fi

  aws secretsmanager create-secret \
    --name "$full_name" \
    --secret-string "$value" \
    --region "$REGION" > /dev/null
  info "Created $full_name (placeholder — update when ready)"
}

# Required — prompt user
create_secret_interactive "database_url"       "DATABASE_URL (postgres://user:pass@host:5432/db)"
create_secret_silent      "session_secret"     "$(openssl rand -hex 32)"

# WhatsApp — parked, placeholders only
echo ""
warn "WhatsApp secrets — storing placeholders. Update in Secrets Manager when ready."
create_secret_silent "whatsapp_api_token"       "REPLACE_ME"
create_secret_silent "whatsapp_phone_number_id" "REPLACE_ME"
create_secret_silent "whatsapp_app_secret"      "REPLACE_ME"
create_secret_silent "whatsapp_verify_token"    "REPLACE_ME"

# Google / AI — prompt user (skip = placeholder)
echo ""
create_secret_interactive "google_client_email" "GOOGLE_CLIENT_EMAIL (service account, or Enter to skip)"
create_secret_interactive "google_private_key"  "GOOGLE_PRIVATE_KEY  (full PEM on one line, or Enter to skip)"
create_secret_interactive "gemini_api_key"       "GEMINI_API_KEY (or Enter to skip)"
create_secret_silent      "s3_bucket"            "saivie-uploads"


# ── 4. CloudWatch Log Group ───────────────────────────────────────────────────
info "Ensuring CloudWatch log group /ecs/saivie-api exists"
aws logs create-log-group \
  --log-group-name "/ecs/saivie-api" \
  --region "$REGION" 2>/dev/null || warn "/ecs/saivie-api log group already exists"

aws logs put-retention-policy \
  --log-group-name "/ecs/saivie-api" \
  --retention-in-days 30 \
  --region "$REGION"


# ── 5. ECS Service ────────────────────────────────────────────────────────────
echo ""
echo "------------------------------------------------------"
echo "  ECS Service setup"
echo "------------------------------------------------------"

# Check if service already exists
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --region "$REGION" \
  --query "services[0].status" \
  --output text 2>/dev/null || echo "NONE")

if [ "$SERVICE_STATUS" = "ACTIVE" ]; then
  warn "ECS service $SERVICE already exists and is ACTIVE — skipping"
else
  echo ""
  warn "To create the ECS service you need a VPC subnet and security group ID."
  echo ""

  echo -n "  Default VPC subnet ID (subnet-xxxxxxxx): "
  read -r SUBNET_ID

  echo -n "  Security group ID (sg-xxxxxxxx) — must allow inbound TCP 8080: "
  read -r SG_ID

  if [ -n "$SUBNET_ID" ] && [ -n "$SG_ID" ]; then
    # Get latest task definition revision
    TASK_DEF_ARN=$(aws ecs describe-task-definition \
      --task-definition "$TASK_FAMILY" \
      --region "$REGION" \
      --query "taskDefinition.taskDefinitionArn" \
      --output text)

    aws ecs create-service \
      --cluster "$CLUSTER" \
      --service-name "$SERVICE" \
      --task-definition "$TASK_DEF_ARN" \
      --desired-count 1 \
      --launch-type FARGATE \
      --deployment-configuration "minimumHealthyPercent=50,maximumPercent=200" \
      --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
      --region "$REGION" > /dev/null
    info "Created ECS service $SERVICE"
  else
    warn "Skipped ECS service creation — run again with subnet/SG IDs, or create in the console"
    echo "  Console link: https://${REGION}.console.aws.amazon.com/ecs/v2/clusters/${CLUSTER}/services"
  fi
fi


# ── 6. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  Bootstrap complete!"
echo "======================================================"
echo ""
echo "  IAM execution role : arn:aws:iam::${ACCOUNT_ID}:role/${EXEC_ROLE}"
echo "  IAM task role       : arn:aws:iam::${ACCOUNT_ID}:role/${TASK_ROLE}"
echo "  CloudWatch logs     : /ecs/saivie-api (30-day retention)"
echo "  Secrets             : saivie/prod/* in ${REGION}"
echo ""
echo "  Next: push to main branch to trigger the GitHub Actions deploy pipeline."
echo "  Monitor: https://${REGION}.console.aws.amazon.com/ecs/v2/clusters/${CLUSTER}/services/${SERVICE}"
echo ""
