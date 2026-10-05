#!/bin/zsh
cd "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  echo 'Node.js 24 or newer is required.'; read '?Press Return to close.'; exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci || exit 1
fi
export LOCAL_AI_PROVIDER="${LOCAL_AI_PROVIDER:-ollama}"
export LOCAL_PORT="${LOCAL_PORT:-8794}"
if [[ "$LOCAL_AI_PROVIDER" == ollama ]] && ! curl --silent --fail http://127.0.0.1:11434/api/tags >/dev/null; then
  if ! command -v ollama >/dev/null; then
    echo 'Install Ollama and a local model first.'; read '?Press Return to close.'; exit 1
  fi
  OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=true ollama serve &
  ollama_pid=$!
  trap 'kill "$ollama_pid" 2>/dev/null' EXIT
fi
if curl --silent --fail "http://127.0.0.1:$LOCAL_PORT/api/local-status" >/dev/null; then
  open "http://localhost:$LOCAL_PORT/automotive/"; exit 0
fi
(sleep 2; open "http://localhost:$LOCAL_PORT/automotive/") &
node local/server.mjs
read '?Press Return to close.'
