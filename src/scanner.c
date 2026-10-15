#include "tree_sitter/parser.h"
#include <wctype.h>

enum TokenType {
  VALUE,
  ERROR_SENTINEL,
  END_OF_FILE,
  BLOCK_COMMENT_BODY,
  BLANK_EOF,
  BLOCK_COMMENT_END,
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

  if (valid_symbols[END_OF_FILE] && lexer->eof(lexer)) {
    lexer->result_symbol = END_OF_FILE;
    return true;
  }

  if (valid_symbols[BLANK_EOF] &&
      (lexer->lookahead == ' ' || lexer->lookahead == '\t')) {
    do {
      lexer->advance(lexer, false);
    } while (lexer->lookahead == ' ' || lexer->lookahead == '\t');
    if (lexer->eof(lexer)) {
      lexer->result_symbol = BLANK_EOF;
      return true;
    }
    return false;
  }

  // Mark the body before each line so only a complete delimiter ends it.
  if (valid_symbols[BLOCK_COMMENT_BODY] || valid_symbols[BLOCK_COMMENT_END]) {
    bool has_body = false;
    while (!lexer->eof(lexer)) {
      lexer->mark_end(lexer);
      const char *end = "end comment";
      while (*end && lexer->lookahead == *end) {
        lexer->advance(lexer, false);
        end++;
      }
      if (!*end) {
        while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
               lexer->lookahead == '\r') lexer->advance(lexer, false);
        if (lexer->lookahead == '\n') {
          if (has_body) {
            lexer->result_symbol = BLOCK_COMMENT_BODY;
            return valid_symbols[BLOCK_COMMENT_BODY];
          }
          lexer->advance(lexer, false);
          lexer->mark_end(lexer);
          lexer->result_symbol = BLOCK_COMMENT_END;
          return valid_symbols[BLOCK_COMMENT_END];
        }
      }
      while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
        lexer->advance(lexer, false);
      }
      if (!lexer->eof(lexer)) lexer->advance(lexer, false);
      has_body = true;
    }
    if (has_body && valid_symbols[BLOCK_COMMENT_BODY]) {
      lexer->mark_end(lexer);
      lexer->result_symbol = BLOCK_COMMENT_BODY;
      return true;
    }
    return false;
  }

  if (valid_symbols[VALUE]) {
    while (lexer->lookahead != '\n' && lexer->lookahead != '\r' &&
           iswspace(lexer->lookahead)) {
      lexer->advance(lexer, true);
    }
    unsigned length = 0;
    while (lexer->lookahead != 0 &&
           lexer->lookahead != ',' &&
           lexer->lookahead != '\n' &&
           lexer->lookahead != '\r') {
      bool nonspace = !iswspace(lexer->lookahead);
      lexer->advance(lexer, false);
      if (nonspace) lexer->mark_end(lexer);
      length++;
    }
    if (length > 0) {
      lexer->result_symbol = VALUE;
      return true;
    }
  }

  return false;
}
