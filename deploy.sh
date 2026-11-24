#!/usr/bin/env bash

# ==========================================================
# DEPLOY - CERAMICA VICENTE PORTELA
# Uso: ./deploy.sh [TAG]
#   CI:    ./deploy.sh v1.2.0
#   Local: ./deploy.sh          (lista e pede a tag interativamente)
# ==========================================================

set -Eeuo pipefail

APP_NAME="ceramica-portela"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$ROOT_DIR/deploy.log"

cd "$ROOT_DIR"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
err()  { echo -e "${RED}[ERRO]${NC} $1" >&2; }
die()  { err "$1"; exit 1; }

tag_exists() {
    git rev-parse "refs/tags/$1" >/dev/null 2>&1
}

read_port_from_env() {
    local port="3000"
    if [[ -f "$ROOT_DIR/.env" ]]; then
        local line
        line="$(grep '^PORT=' "$ROOT_DIR/.env" | tail -1 | cut -d= -f2- | tr -d ' "\r')"
        [[ -n "$line" ]] && port="$line"
    fi
    echo "$port"
}

# Verificar utilizador
if [[ "$(id -un)" != "vieira" ]]; then
    die "Executa o deploy com o utilizador vieira."
fi

# Verificar comandos
for cmd in git npm node pm2 curl; do
    command -v "$cmd" >/dev/null 2>&1 || die "$cmd não está instalado."
done

# Verificar estrutura
[[ -f "$ROOT_DIR/package.json" ]] || die "package.json não encontrado."
[[ -f "$ROOT_DIR/client/package.json" ]] || die "client/package.json não encontrado."
[[ -f "$ROOT_DIR/.env" ]] || die "Ficheiro .env não encontrado."

# Verificar Git
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || die "Diretório não é um repositório Git."

# Atualizar tags antes da seleção
info "A atualizar tags do repositório Git..."
git fetch origin --tags -f >/dev/null 2>&1 || git fetch --tags -f >/dev/null 2>&1 || true

# Tag: argumento CLI (CI) ou seleção interativa (manual)
TAG="${1:-}"
if [[ -z "$TAG" ]]; then
    LATEST_TAG="$(git tag -l --sort=-creatordate | head -n 1)"

    echo
    echo "Últimas 10 tags (mais recente no final):"
    echo "--------------------------------------------------"
    git tag -l --sort=creatordate -n | tail -n 10
    echo "--------------------------------------------------"
    echo

    while true; do
        if [[ -n "$LATEST_TAG" ]]; then
            read -rp "Digite a TAG [padrão: $LATEST_TAG]: " TAG
            TAG="${TAG:-$LATEST_TAG}"
        else
            read -rp "Digite a TAG: " TAG
        fi

        [[ -z "$TAG" ]] && continue
        if tag_exists "$TAG"; then
            break
        fi
        err "Tag \"$TAG\" inexistente."
    done
else
    if ! tag_exists "$TAG"; then
        die "Tag \"$TAG\" inexistente (executa 'git fetch --tags' antes)."
    fi
fi

# Registar execução no log (após seleção interativa da TAG)
exec > >(tee -a "$LOG_FILE") 2>&1

echo
echo "=================================================="
echo " DEPLOY CERAMICA VICENTE PORTELA"
echo " Versão: $TAG"
echo " Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "=================================================="
echo

# Preservar versão atual para rollback
PREVIOUS_COMMIT="$(git rev-parse HEAD)"
APP_PORT="$(read_port_from_env)"

info "A fazer checkout da tag ${TAG}..."
git checkout "tags/${TAG}" -f

CURRENT_COMMIT="$(git rev-parse HEAD)"
ok "Código atualizado: ${TAG} (${CURRENT_COMMIT:0:12})"

# Versão e ambiente de produção
export NODE_ENV=production
export APP_ENV=production
export APP_VERSION="$TAG"
export VITE_APP_VERSION="$TAG"

# Dependências do servidor
info "A instalar dependências do servidor..."
npm ci --omit=dev --no-audit --no-fund

# Dependências do frontend
info "A instalar dependências do frontend..."
NODE_ENV=development npm ci --prefix client --no-audit --no-fund

# Compilar React
info "A compilar frontend para produção (${TAG})..."
NODE_OPTIONS="--max-old-space-size=1024" APP_ENV=production VITE_APP_VERSION="$TAG" NODE_ENV=production npm run build:client

[[ -f "$ROOT_DIR/client/dist/index.html" ]] \
    || die "Build falhou: client/dist/index.html não encontrado."

ok "Build concluído."

# Reiniciar PM2
info "A reiniciar aplicação PM2..."

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME" --update-env
else
    pm2 start server.js \
        --name "$APP_NAME" \
        --cwd "$ROOT_DIR" \
        --update-env
fi

# Verificar aplicação
info "A aguardar arranque da aplicação (porta ${APP_PORT})..."
sleep 5

if ! curl -fsS --max-time 10 "http://127.0.0.1:${APP_PORT}/" >/dev/null; then
    warn "A aplicação não respondeu. A tentar recuperar versão anterior."

    git checkout -f "$PREVIOUS_COMMIT"

    NODE_OPTIONS="--max-old-space-size=1024" npm run build:client

    pm2 restart "$APP_NAME" --update-env || true

    die "Deploy falhou. Foi reposta a versão anterior do código."
fi

# Guardar configuração PM2
pm2 save

echo
echo "=================================================="
ok "DEPLOY CONCLUÍDO COM SUCESSO!"
echo " Aplicação: $APP_NAME"
echo " Domínio: https://ceramicaportela.sytes.net"
echo " Tag: $TAG"
echo " Commit: $(git rev-parse --short HEAD)"
echo "=================================================="
