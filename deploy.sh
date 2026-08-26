#!/usr/bin/env bash
# Deploy na Vercel. Le as variaveis de .env.local e envia para o projeto.
# Uso:  bash deploy.sh
set -e

cd "$(dirname "$0")"

if [ ! -f .env.local ]; then
  echo "Falta o arquivo .env.local"
  exit 1
fi

echo "==> Login e vinculo do projeto (abre o navegador na primeira vez)"
npx vercel link

echo "==> Enviando variaveis de ambiente"
while IFS='=' read -r key value; do
  case "$key" in
    ''|\#*) continue ;;
  esac
  [ -z "$value" ] && continue
  for env in production preview development; do
    # remove a variavel antiga (se existir) e grava a atual
    npx vercel env rm "$key" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | npx vercel env add "$key" "$env" >/dev/null
  done
  echo "   $key"
done < .env.local

echo "==> Deploy de producao"
npx vercel --prod
