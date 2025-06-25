#!/bin/bash
cd "$(dirname "$0")"

# Load environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Example usage: pass prompt to ai_router
python3 ai_router.py "$@"