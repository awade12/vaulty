#!/usr/bin/env bash
set -euo pipefail

# MinIO installer for Vaulty
# Usage: curl -fsSL https://raw.githubusercontent.com/awade12/vaulty/main/scripts/install-minio.sh | bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[minio]${NC} $*"; }
warn()    { echo -e "${YELLOW}[minio]${NC} $*"; }
error()   { echo -e "${RED}[minio]${NC} $*" >&2; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin}"
MINIO_API_PORT="${MINIO_API_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
DATA_DIR="${MINIO_DATA_DIR:-$HOME/minio/data}"
CONTAINER_NAME="vaulty-minio"
IMAGE="quay.io/minio/minio"

# ── Docker check / install ────────────────────────────────────────────────────
ensure_docker() {
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    info "Docker $(docker --version | awk '{print $3}' | tr -d ',') is ready."
    return
  fi

  warn "Docker not found — installing now..."

  OS="$(uname -s)"
  case "$OS" in
    Darwin)
      if command -v brew &>/dev/null; then
        brew install --cask docker
        info "Docker Desktop installed via Homebrew. Please open Docker Desktop to finish setup, then re-run this script."
        exit 0
      else
        error "Homebrew not found. Install Docker Desktop manually from https://www.docker.com/products/docker-desktop and re-run."
      fi
      ;;
    Linux)
      if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
          | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
          https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
          | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
        sudo apt-get update -qq
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl enable --now docker
        sudo usermod -aG docker "$USER"
        info "Docker installed. You may need to log out and back in for group membership to take effect."
      elif command -v yum &>/dev/null; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl enable --now docker
        sudo usermod -aG docker "$USER"
        info "Docker installed."
      else
        error "Unsupported Linux distro. Install Docker manually: https://docs.docker.com/engine/install/"
      fi
      ;;
    *)
      error "Unsupported OS: $OS"
      ;;
  esac

  if ! docker info &>/dev/null 2>&1; then
    error "Docker was installed but the daemon isn't running. Start Docker and re-run this script."
  fi
}

# ── Port availability ─────────────────────────────────────────────────────────
check_port() {
  local port=$1
  if lsof -i ":$port" &>/dev/null 2>&1; then
    warn "Port $port is already in use. Override with MINIO_API_PORT / MINIO_CONSOLE_PORT env vars."
    error "Aborting — port conflict on $port."
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  info "Starting MinIO setup..."

  ensure_docker

  check_port "$MINIO_API_PORT"
  check_port "$MINIO_CONSOLE_PORT"

  # Create data dir
  mkdir -p "$DATA_DIR"
  chmod 755 "$DATA_DIR"
  info "Data directory: $DATA_DIR"

  # Remove stale container if it exists
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    warn "Removing existing container '$CONTAINER_NAME'..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
  fi

  info "Pulling MinIO image..."
  docker pull "$IMAGE" --quiet

  info "Starting MinIO container..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "${MINIO_API_PORT}:9000" \
    -p "${MINIO_CONSOLE_PORT}:9001" \
    -v "${DATA_DIR}:/data" \
    -e "MINIO_ROOT_USER=${MINIO_USER}" \
    -e "MINIO_ROOT_PASSWORD=${MINIO_PASS}" \
    "$IMAGE" server /data --console-address ":9001" \
    >/dev/null

  # Wait for health
  info "Waiting for MinIO to become healthy..."
  local retries=20
  until curl -sf "http://localhost:${MINIO_API_PORT}/minio/health/live" &>/dev/null; do
    retries=$((retries - 1))
    [ $retries -le 0 ] && error "MinIO did not become healthy in time. Run: docker logs $CONTAINER_NAME"
    sleep 1
  done

  echo ""
  echo -e "${GREEN}MinIO is running!${NC}"
  echo "  S3 API:   http://localhost:${MINIO_API_PORT}"
  echo "  Console:  http://localhost:${MINIO_CONSOLE_PORT}"
  echo "  User:     ${MINIO_USER}"
  echo "  Password: ${MINIO_PASS}"
  echo ""
  echo "Stop:    docker stop $CONTAINER_NAME"
  echo "Start:   docker start $CONTAINER_NAME"
  echo "Logs:    docker logs -f $CONTAINER_NAME"
  echo "Remove:  docker rm -f $CONTAINER_NAME"
}

main "$@"
