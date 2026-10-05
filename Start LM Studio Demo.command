#!/bin/zsh
cd "${0:A:h}" || exit 1
export LOCAL_AI_PROVIDER=lmstudio
export LOCAL_PORT="${LOCAL_PORT:-8795}"
echo 'In LM Studio, load a local model and start the local server on port 1234.'
echo 'Enter its model identifier (leave blank if exactly one model is available):'
read LOCAL_AI_MODEL
export LOCAL_AI_MODEL
exec './Start Local Demo.command'
