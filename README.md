# Tree Sitter Hledger

> A tree-sitter parser for the [hledger] plain text accounting application.

This repo was inspired by [ledger-grammar] but tweaked in a way to work better
with hledger.

To build the parser run: `tree-sitter generate`
To test the parser run: `tree-sitter test`

To use in Neovim: `:TSInstall! hledger`

Highlight and fold queries are bundled in `queries/`. With nvim-treesitter,
set `queries = "queries"` in the hledger parser's `install_info` to install
them alongside the parser. For a local checkout, nvim-treesitter links this
directory so query edits are available without copying files.

Remove any overrides in your Neovim configuration's `queries/hledger/`
directory to use the bundled queries. Restart Neovim after updating an already
loaded query.

## Currently unsupported

- some special syntax that is supported mainly for backward compatibility or
  ledger interoperability


[hledger]: https://hledger.org/
[ledger-grammar]: https://github.com/cbarrete/tree-sitter-ledger
