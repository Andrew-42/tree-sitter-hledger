# Tree Sitter Hledger

> A tree-sitter parser for the [hledger] plain text accounting application.

This repo was inspired by [ledger-grammar] but tweaked in a way to work better
with hledger.

## Currently unsupported

- **tags** in comments
  - so far I didn't find a way to make it work
- some special syntax that is supported mainly for backward compatibility or
  ledger interoperability


[hledger]: https://hledger.org/
[ledger-grammar]: https://github.com/cbarrete/tree-sitter-ledger
