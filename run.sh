#!/bin/sh
# Usage: ./run.sh scripts/03-vector-search.js
# Loads .env (MONGODB_URI), then runs the script with mongosh.
# We cd to the repo root first so load("vectors/...") paths resolve.
set -e
cd "$(dirname "$0")"
if [ -z "$1" ]; then echo "usage: ./run.sh scripts/NN-name.js" >&2; exit 1; fi
if [ ! -f .env ]; then echo "missing .env (copy .env.example)" >&2; exit 1; fi
set -a
. ./.env
set +a
mongosh "$MONGODB_URI" --quiet --file "$1"
