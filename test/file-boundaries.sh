#!/bin/sh
# Preserve the literal CRLF and missing final newlines in these fixtures.
set -eu
cd "$(dirname "$0")/.."
"${1:-tree-sitter}" parse --quiet test/fixtures/file_boundaries/*.journal
