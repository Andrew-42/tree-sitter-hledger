# hledger grammar improvement plan

Fix the core syntax first, then cover directives and compatibility syntax, and finally verify Neovim integration. This document plans the work; it does not implement grammar changes.

The official [EBNF specification](https://hledger.org/SPEC-journal.html) describes itself as a rough approximation. Where it conflicts with the [manual](https://hledger.org/1.52/hledger.html#journal), verify against hledger's reader implementation before changing the grammar.

## 1. Establish a compatibility checklist

- [x] Target a specific hledger version: **1.52**.
- [x] Map each documented construct to its grammar rule and corpus coverage: see [compatibility checklist](hledger-compatibility.md).
- [x] Separate confirmed defects from cases needing verification in that checklist.
- [x] Preserve existing working-tree edits: the pre-existing untracked plan was retained and updated in place; no implementation files were changed.

## 2. Fix ordinary transactions and descriptions

- [ ] Add secondary dates.
- [ ] Allow punctuation currently excluded from descriptions and payees.
- [ ] Support `payee|note`, including empty sides and spacing variations.
- [ ] Correct comment boundaries: descriptions should not consume comment text.
- [ ] Verify permitted spacing around dates, statuses, and codes.
- [ ] Keep header tokens from accidentally spanning lines.

## 3. Fix amounts

- [ ] Support commodityless amounts.
- [ ] Support signs before commodities, such as `-$1`, and permitted sign spacing.
- [ ] Add scientific notation, leading/trailing decimal marks, and supported Unicode grouping spaces.
- [ ] Verify commodity characters and quoting against the reader.
- [ ] Ensure quantity tokens stop at field boundaries rather than absorbing adjacent fields.

## 4. Fix postings, costs, and balances

- [ ] Parse posting status separately from account names.
- [ ] Allow balance assignments without an explicit posting amount.
- [ ] Correct account tokenization and two-space/tab delimiters.
- [ ] Represent real, virtual, and balanced virtual postings distinctly; currently wrappers are just account text.
- [ ] Verify whitespace around costs and assertions, including compact forms.
- [ ] Preserve the existing assertion operators and assertion costs.
- [ ] Associate continuation comments with the appropriate transaction or posting.

## 5. Complete recurring and automatic rules

- [ ] Replace the restrictive period regex with support for documented period expressions.
- [ ] Support periodic heading status, code, description, and comments.
- [ ] Allow multi-term and quoted automatic-rule queries.
- [ ] Support rule comments and applicable posting syntax.
- [ ] Verify multiplier syntax and whitespace after `~` and `=`.

## 6. Complete directives

- [ ] Add default year/commodity, aliases and their terminators, and account scopes.
- [ ] Audit accepted alternative directive spellings and prefixes.
- [ ] Support commodity subdirectives and other accepted indented directive content.
- [ ] Verify account subdirectives rather than assuming the current list is complete.
- [ ] Support include paths with spaces and documented format prefixes.
- [ ] Add optional time information to price directives.
- [ ] Ensure every directive respects line boundaries.

## 7. Fix comments, tags, and file boundaries

- [ ] Audit all supported top-level comment markers.
- [ ] Make block-comment terminators line-aware.
- [ ] Review tag names, empty values, comma boundaries, and whitespace behavior in `src/scanner.c`.
- [ ] Accept whitespace-only blank lines and trailing whitespace.
- [ ] Verify CRLF and files without a final newline.

## 8. Cover compatibility annotations

- [ ] Add supported lot prices, dates, and labels.
- [ ] Audit virtual costs and accepted-but-ignored Ledger directives.
- [ ] Keep accounting validation—balancing, inferred amounts, and assertion evaluation—outside the syntax parser.

## 9. Validate and integrate with Neovim

- [ ] Add focused corpus examples for every confirmed gap, checking tree structure as well as absence of errors.
- [ ] Check ambiguous cases against the targeted hledger reader.
- [ ] Test malformed and incomplete entries for useful editor recovery.
- [ ] Regenerate the parser and run the corpus.
- [ ] Audit highlighting/folding queries, filetype registration, scanner build configuration, and README support claims.

## First implementation milestone

Ordinary transactions, amounts, and postings: these contain the highest-impact defects in the current grammar.
