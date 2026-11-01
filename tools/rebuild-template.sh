#!/bin/sh
# Rebuild template/ from Christy's site (../christys-v2) + tools/templatize.py
set -e; cd "$(dirname "$0")/.."; SRC=${1:-../christys-v2}
rm -rf template && mkdir template && (cd "$SRC" && tar cf - --exclude=node_modules --exclude=data --exclude='public/img' --exclude=test_e2e.py --exclude=.git .) | (cd template && tar xf -)
mkdir -p template/public/img && python3 tools/templatize.py template
