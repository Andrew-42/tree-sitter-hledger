# hledger grammar improvement plan

Fix the core syntax first, then cover directives and compatibility syntax, and finally verify Neovim integration. This document plans the work; it does not implement grammar changes.

The official [EBNF specification](https://hledger.org/SPEC-journal.html) describes itself as a rough approximation. Where it conflicts with the [manual](https://hledger.org/1.52/hledger.html#journal), verify against hledger's reader implementation before changing the grammar.

## 1. Establish a compatibility checklist

- [x] Target a specific hledger version: **1.52**.
- [x] Map each documented construct to its grammar rule and corpus coverage: see [compatibility checklist](hledger-compatibility.md).
- [x] Separate confirmed defects from cases needing verification in that checklist.
- [x] Preserve existing working-tree edits: the pre-existing untracked plan was retained and updated in place; no implementation files were changed.

## 2. Fix ordinary transactions and descriptions

- [x] Add secondary dates.
- [x] Allow punctuation currently excluded from descriptions and payees.
- [x] Support `payee|note`, including empty sides and spacing variations.
- [x] Correct comment boundaries: descriptions should not consume comment text.
- [x] Verify permitted spacing around dates, statuses, and codes.
- [x] Keep header tokens from accidentally spanning lines.

## 3. Fix amounts

- [x] Support commodityless amounts.
- [x] Support signs before commodities, such as `-$1`, and permitted sign spacing.
- [x] Add scientific notation, leading/trailing decimal marks, and supported Unicode grouping spaces.
- [x] Verify commodity characters and quoting against the reader.
- [x] Ensure quantity tokens stop at field boundaries rather than absorbing adjacent fields.

## 4. Fix postings, costs, and balances

- [x] Parse posting status separately from account names.
- [x] Allow balance assignments without an explicit posting amount.
- [x] Correct account tokenization and two-space/tab delimiters.
- [x] Represent real, virtual, and balanced virtual postings distinctly; currently wrappers are just account text.
- [x] Verify whitespace around costs and assertions, including compact forms.
- [x] Preserve the existing assertion operators and assertion costs.
- [x] Associate continuation comments with the appropriate transaction or posting.

## 5. Complete recurring and automatic rules

- [x] Replace the restrictive period regex with support for documented period expressions.
- [x] Support periodic heading status, code, description, and comments.
- [x] Allow multi-term and quoted automatic-rule queries.
- [x] Support rule comments and applicable posting syntax.
- [x] Verify multiplier syntax and whitespace after `~` and `=`.

Verified against the hledger 1.52 `JournalReader` and `Common` readers: markers allow zero or more spaces; a multiplier `*` directly precedes its amount. Period expressions are preserved as single-spaced text, with calendar validation left to hledger. Coverage: `test/corpus/recurring_rules.txt`.

## 6. Complete directives

- [x] Add default year/commodity, aliases and their terminators, and account scopes.
- [x] Audit accepted alternative directive spellings and prefixes.
- [x] Support commodity subdirectives and other accepted indented directive content.
- [x] Verify account subdirectives rather than assuming the current list is complete.
- [x] Support include paths with spaces and documented format prefixes.
- [x] Add optional time information to price directives.
- [x] Ensure every directive respects line boundaries.

Verified against the hledger 1.52 `JournalReader` and `Common` readers. Coverage: `test/corpus/directives.txt`; default-year spellings, directive prefixes (excluding `P`), open indented metadata, include reader prefixes and spaces, price times and offsets, and line boundaries. `end apply year` is accepted without restoring a previous year, matching the reader. Accounting effects and format/calendar validation remain with hledger.

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
