# Tree Sitter Hledger

> A tree-sitter parser for the [hledger] plain text accounting application.

This repo was inspired by [ledger-grammar] but tweaked in a way to work better
with hledger.

To build the parser run: `tree-sitter generate`
To test the parser run: `tree-sitter test`

To regenerate, build, and install the parser and queries directly for Neovim:

```sh
make install-neovim
```

Targets native hledger **1.52** journal syntax. Calendar validity, period/query
semantics, and accounting validation remain hledger's responsibility. Posting
dates inside comments remain generic tags/text. See [the compatibility audit](hledger-compatibility.md).

| Syntax / feature                        | Support                    | Details                                                                                                                                            |
| --------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction headings                    | Supported                  | Primary and secondary dates, yearless dates, statuses, codes, descriptions, and payee/note splits.                                                 |
| Amounts and commodities                 | Supported                  | Commodityless amounts, quoted commodities, signs, scientific notation, decimal/grouping marks, and Unicode grouping spaces.                        |
| Postings                                | Supported                  | Statuses, hierarchical accounts, omitted amounts, real, virtual, and balanced virtual postings.                                                    |
| Costs and balances                      | Supported                  | Unit/total costs (`@`, `@@`), balance assignments, all four assertion operators (`=`, `==`, `=*`, `==*`), and assertion costs.                     |
| Periodic and automatic rules            | Supported                  | Period expressions, multi-term/quoted queries, multipliers, comments, and posting fields.                                                          |
| Directives                              | Supported                  | Accounts, commodities, payees, tags, includes, prices with optional times, default year/commodity, aliases, account scopes, and indented metadata. |
| Comments and tags                       | Supported                  | Line and block comments, continuation comments, tags, and empty tag values.                                                                        |
| File boundaries                         | Supported                  | LF/CRLF, whitespace-only lines, trailing whitespace, and missing final newlines.                                                                   |
| Posting dates in comments               | Generic text/tags          | `date:`, `date2:`, and bracket notation are accepted without dedicated date nodes.                                                                 |
| Ledger lot and valuation annotations    | Unsupported / out of scope | Lot prices, lot dates, lot labels, valuation expressions, and parenthesised cost operators.                                                        |
| Ignored Ledger compatibility directives | Out of scope               | No general support guarantee; existing compatibility forms may remain accepted.                                                                    |
| Other input formats                     | Unsupported                | CSV, timedot, timeclock, and rules files; include paths may still reference them.                                                                  |
| Semantic validation                     | Outside parser scope       | Calendar validity, period/query semantics, balancing, inferred amounts, directive effects, and assertion evaluation belong to hledger.             |

This uses `tree-sitter`, a C compiler, and `nvim` on your PATH. It installs
`parser/hledger.so` and the bundled queries under Neovim's `stdpath('data')/site`,
so `:TSInstall hledger` is unnecessary. Restart Neovim after reinstalling a loaded
parser. Override `TS`, `NVIM_BIN`, or `NVIM_SITE` as needed, for example
`make install-neovim TS=/path/to/tree-sitter NVIM_SITE=/custom/nvim/site`.
Keep the filetype registration and Tree-sitter startup configuration below;
the `require('nvim-treesitter.parsers').hledger` registration is only needed
when installing through nvim-treesitter.

Alternatively, to use nvim-treesitter's installer, register this checkout before running
`:TSInstall hledger` (configuration for the current `install_info.path` API):

```lua
require('nvim-treesitter.parsers').hledger = {
  install_info = {
    path = '/absolute/path/to/tree-sitter-hledger',
    generate = true,
    queries = 'queries',
  },
}
vim.filetype.add({ extension = { journal = 'hledger', j = 'hledger' } })
vim.treesitter.language.register('hledger', 'hledger')
vim.api.nvim_create_autocmd('FileType', {
  pattern = 'hledger',
  callback = function(args) vim.treesitter.start(args.buf, 'hledger') end,
})
```

The build must include both `src/parser.c` and `src/scanner.c`. Older
nvim-treesitter configurations using `install_info.files` must list both.
For folding, set `foldmethod=expr` and
`foldexpr=v:lua.vim.treesitter.foldexpr()` in hledger buffers.

Highlight and fold queries are bundled in `queries/`. With nvim-treesitter,
set `queries = "queries"` in the hledger parser's `install_info` to install
them alongside the parser. For a local checkout, nvim-treesitter links this
directory so query edits are available without copying files.

Remove any overrides in your Neovim configuration's `queries/hledger/`
directory to use the bundled queries. Restart Neovim after updating an already
loaded query.

Validation:

```sh
tree-sitter generate
tree-sitter test
sh test/file-boundaries.sh
make
HLEDGER_PARSER="$PWD/libtree-sitter-hledger.dylib" nvim --headless -u NONE -i NONE -n -l test/neovim.lua
```

Use `libtree-sitter-hledger.so` on Linux. The Neovim check loads the freshly
built parser and bundled queries, checks filetype registration and all eight
fold types, and verifies exact fold ranges. It requires Neovim with
`vim.treesitter.foldexpr` and `-l` support.

[hledger]: https://hledger.org/
[ledger-grammar]: https://github.com/cbarrete/tree-sitter-ledger
