#include "tree_sitter/parser.h"

enum TokenType {
  VALUE,
  ERROR_SENTINEL,
};

void *tree_sitter_hledger_external_scanner_create(void) { return NULL; }
void tree_sitter_hledger_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_hledger_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_hledger_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

bool tree_sitter_hledger_external_scanner_scan(
  void *payload,
  TSLexer *lexer,
  const bool *valid_symbols
) {
  // During error recovery, all symbols are valid. Bail out.
  if (valid_symbols[ERROR_SENTINEL]) {
    return false;
  }

  if (valid_symbols[VALUE]) {
    // Don't match value if it starts with whitespace (means tag has no value)
    if (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
      return false;
    }
    unsigned length = 0;
    while (lexer->lookahead != 0 &&
           lexer->lookahead != ',' &&
           lexer->lookahead != '\n' &&
           lexer->lookahead != '\r') {
      lexer->advance(lexer, false);
      length++;
    }
    if (length > 0) {
      lexer->result_symbol = VALUE;
      return true;
    }
  }

  return false;
}
