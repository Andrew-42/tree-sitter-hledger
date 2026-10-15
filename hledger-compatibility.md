# hledger 1.52 compatibility checklist

This audit targets **hledger 1.52 journal syntax**. It inventories the current grammar and checked-in corpus; it does not claim that the corpus passes or change parser behavior. Non-journal formats (CSV, timedot, timeclock, rules) are outside scope, except their prefixes in include paths. Balancing, inferred values, directive effects, and assertion evaluation remain hledger's responsibility.

Sources, in order of authority when syntax is ambiguous:

- [1.52 JournalReader.hs](https://github.com/simonmichael/hledger/blob/1.52/hledger-lib/Hledger/Read/JournalReader.hs): journal items, directives, transactions, posting rules.
- [1.52 Common.hs](https://github.com/simonmichael/hledger/blob/1.52/hledger-lib/Hledger/Read/Common.hs): dates, amounts, annotations, comments, tags.
- [1.52 manual, Journal](https://hledger.org/1.52/hledger.html#journal): documented user-facing syntax.
- [Journal EBNF](https://hledger.org/SPEC-journal.html): supplementary, unversioned approximation; not the compatibility authority.

Audit date: 2026-10-15. Reader source was inspected at tag `1.52`. Neither `hledger` nor `tree-sitter` was available on PATH, and no local Node CLI was installed. Findings below come from static grammar/corpus and reader inspection, not execution. Recheck ambiguous examples with a 1.52 executable when implementing them.

## Reading the inventory

**Covered** means a corpus example exists, not complete support. **Gap** means the reader accepts a construct for which a grammar production is missing, too restrictive, or structurally misleading. **Verify** means exact acceptance or boundaries still require focused reader checks. Corpus paths below are relative to `test/corpus/`. Step numbers refer to `hledger-plan.md`.

## Transactions, amounts, and postings

| Construct | Current grammar rules | Existing corpus evidence | Status / next work |
| --- | --- | --- | --- |
| Ordinary heading and optional description | `transaction`, `transaction_heading`, `note` | `transaction.txt`: Incomplete transaction; Simple transaction test | Covered basics; zero-posting syntax already represented. Step 2. |
| Full and yearless dates, separators, omitted zeroes | `date`, `_2d`, `_4d`, `_dsep` | `transaction.txt`: ISO and slash dates | Partial coverage; verify exact year widths, consistent separators, and yearless context with `datep`. Calendar validity stays outside grammar. Step 2. |
| Secondary transaction date (`DATE=DATE2`) | `transaction_heading` has only one `date` | None | Gap: `transactionp` calls `secondarydatep`. Step 2. |
| Heading status and parenthesised code | `status`, `code` | `transaction.txt`: Transaction test - heading | Covered `! (12345)`; gap: code regex permits newlines, unlike `codep`. Verify all spacing combinations. Step 2. |
| Punctuation and spaces in description | `note`, `payee` | Simple text and commas in `transaction.txt` | Gap: reader `descriptionp` stops at semicolon/newline; grammar excludes `!`, `*`, `(`, `)`, and pipes. Step 2. |
| Payee/note split, empty sides, unspaced pipe | `transaction_heading`, `payee`, `note` | None | Gap: grammar requires whitespace on both sides of a nonempty payee and cannot represent general `payee|note`. Verify multiple pipes and tree design. Step 2. |
| Heading comment boundary | `_sep_tag_comment`, `note`, `payee` | `transaction.txt`: Incomplete transaction; heading comments | Gap: note/payee regex can consume semicolons; separator requires two whitespace characters, while reader permits same-line comments without that delimiter. Step 2. |
| Omitted posting amount | `posting` | `transaction.txt`: Simple transaction test | Covered; preserve it. Step 4. |
| Commodity before/after quantity, negative quantity, quoted commodity | `amount`, `quantity`, `neg_quantity`, `commodity` | `transaction.txt`: more postings; heading; assert | Covered common forms; no dedicated comprehensive amount corpus. Step 3. |
| Commodityless ordinary amount | `amount` always requires `commodity`; only `auto_amount` accepts bare quantities | Bare multiplier amounts in `autopostings.txt` only | Gap: `simpleamountp` explicitly supports no-symbol amounts. Step 3. |
| Sign before commodity and sign whitespace | `amount`, `neg_quantity` | `$-500` covered; `-$1` absent | Gap: reader `signp` permits signs before commodity and spaces after signs; grammar cannot. Step 3. |
| Decimal/group marks, exponent, leading/trailing decimal | `quantity`, `neg_quantity` | Decimal examples in costs; no dedicated edge cases | Gap: reader supports exponents and decimal forms beyond current digit-first regex. Verify Unicode grouping characters and ambiguous separator combinations before implementing. Step 3. |
| Commodity alphabet and quoting | `commodity` | Letters, currency symbol, quoted words in `transaction.txt` | Gap: quoted regex accepts semicolons rejected by `quotedcommoditysymbolp`. Verify full unquoted character set against `isNonsimpleCommodityChar`; letters/currency-only alternatives are incomplete. Step 3. |
| Quantity field boundaries | `quantity`, `neg_quantity` | No adjacent-field regression cases | Verify: regex permits spaces within numbers; establish valid grouping versus delimiter behavior. Step 3. |
| Posting status | `posting`, `account` | None | Gap: status is currently account text; reader parses it independently. Step 4. |
| Account names, hierarchy, spaces, tab delimiter | `account`, `_spacer` | `account.txt`: Account multi word name; `transaction.txt`: expenses: clothing | Partial; verify single-tab behavior before changing `_spacer`: reader `singlespacep` accepts one non-newline whitespace character within a name, so a tab is not unconditionally a delimiter. Also verify semicolons inside later account words, wrappers, and trailing spaces. Step 4. |
| Real / virtual / balanced virtual postings | `posting`, `account` | Parenthesised accounts in `periodic_transactions.txt`, `autopostings.txt` | Gap in structure: parentheses are account text, with no posting-type node; square-bracket accounts lack dedicated coverage. Step 4. |
| Unit/total costs (`@`, `@@`) | `_cost_amount`, `cost` | `transaction.txt`: Transaction test - cost | Covered spaced forms; gap: reader permits compact forms such as `1 USD@$2`. Step 4. |
| Assertion operators (`=`, `==`, `=*`, `==*`) | `_assert_amount`, `assert` | `transaction.txt`: both Transaction test - assert cases use `=` only | Preserve all four productions; add operator coverage. Gap: reader allows compact boundaries, grammar requires spaces around operator. Step 4. |
| Balance assignments with omitted amount | `posting`, `_assert_amount` | None | Gap: assertion is nested under a required explicit amount; reader parses amount and assertion independently. Step 4. |
| Assertion costs | `_assert_amount`, `_cost_amount` | `transaction.txt`: second Transaction test - assert, `@` and `@@` | Covered; preserve. Reader uses `amountnobasisp`: costs allowed, cost basis excluded. Step 4. |
| Continuation comments and ownership | `posting`, `tag_comment` | `transaction.txt`: posting comment; cost; tag comment | Gap in structure: every indented comment is a posting node; reader associates continuation comments with heading or preceding posting. Step 4. |
| Posting dates in comments (`date:`, `date2:`, bracket notation) | `tag_value` / generic comment text only | None | No explicit date structure; verify accepted forms with `postingcommentp` and decide whether date nodes are needed. Steps 4, 7. |

## Recurring and automatic rules

| Construct | Current grammar rules | Existing corpus evidence | Status / next work |
| --- | --- | --- | --- |
| Periodic expression and description | `periodic_transaction`, `period`, `note` | `periodic_transactions.txt`: monthly budget | Covered simple monthly form; gap: period regex excludes `/`, `.`, commas and other period-expression syntax. Verify expression families against `periodexprp`. Step 5. |
| Periodic status, code, heading comments | `periodic_transaction` | Comment covered in monthly example | Gap: no status/code productions; reader reuses `statusp`, `codep`, `descriptionp`. Step 5. |
| Automatic query, quoted/multiple terms, comments | `auto_transaction`, `query` | `autopostings.txt`: single account query | Gap: `query` is one non-whitespace token, while reader consumes a description and comment. Step 5. |
| No space after `~` / `=` | `_whitechar` required in both headings | None | Gap: reader calls zero-or-more `skipNonNewlineSpaces`. Step 5. |
| Multiplier and posting syntax in automatic rules | `autoposting`, `multiply`, `auto_amount` | `autopostings.txt`: `*-1`, `*1`, `$-1` | Covered basic multiplier; gap: separate autoposting grammar omits status, assertions, costs, tags, and optional amounts supported by shared `postingphelper`. Verify multiplier spacing. Step 5. |

## Directives

`JournalReader.directivep` accepts optional `!` or `@` prefixes for its directive alternatives. The separately dispatched market price `P` parser is outside that wrapper: do not assume prefixes apply to `P`.

| Construct | Current grammar rules | Existing corpus evidence | Status / next work |
| --- | --- | --- | --- |
| `account`, comments/tags, arbitrary indented content | `account_directive`, `account_subdirective`, six subdirective alternatives | `account.txt`: basic, comment, multiword | Gap: reader skips arbitrary indented lines, whereas grammar uses a closed list; reader reads account type from tags, not a validated `type` subdirective. Step 6. |
| `alias`, `end aliases`, basic/regex aliases | None (account `alias_subdirective` is separate) | None | Gap: `aliasdirectivep`, `endaliasesdirectivep`. Step 6. |
| `apply account`, `end apply account` | None | None | Gap: reader has both scope productions. Step 6. |
| `Y`, `year`, `apply year`; `D` | None | None | Gap: `defaultyeardirectivep`, `defaultcommoditydirectivep`. Step 6. |
| `commodity`, amount format, indented `format` and other content | `commodity_directive` | None | One-line productions exist but untested; gap: multiline content absent, reader accepts format and other indented lines. Step 6. |
| `decimal-mark` | `decimal_mark_directive` | None | Present but untested; verify comments and line boundary. Step 6. |
| `include`, paths/globs, spaces, format prefix | `include_directive`, `file_path` | `special_directives.txt`: relative path, comment | Gap: reader accepts spaces through semicolon/newline; path grammar does not. Verify reader prefixes and Windows/glob examples. Step 6. |
| `P DATE [TIME] COMMODITY AMOUNT` | `price_directive` | None | Gap: no time production; date/amount inherit other restrictions. Verify timezone and compact spacing with `datetimep` and reader tests. Step 6. |
| `payee`, quoted/empty names, comments/tags, indented content | `payee_directive`, `payee` | None | Gap: reader supports quoted empty names and arbitrary indented lines; grammar requires a nonempty restrictive token. Step 6. |
| `tag`, comments, indented content | `tag_directive`, `tag` | `tag.txt`: Tag directive test | Covered basic name; gap: continuation/indented content absent. Verify tag alphabet independently from comment tag names. Step 6. |
| Alternative prefixes `!`, `@` | No directive prefix production | None | Gap confirmed by `directivep`; `!account` is also an upstream test case. Step 6. |
| Ignored compatibility directives | None | None | Gap: reader accepts the list below. Step 8. |

Accepted compatibility forms from the reader's dispatch and implementations: `apply fixed`, `end apply fixed`, `apply tag`, `end apply tag`, `end tag`, `end apply year`, `assert`, `A` / `bucket`, `capture`, `check`, `define`, `expr`, `value`, `eval`, `python`, `--` command-line flags, `N` ignored-price commodity, and `C` commodity conversion. Most discard line contents; `python` also consumes indented lines. Implement their syntax without assigning accounting semantics. Exact boundaries and multiline behavior need corpus cases.

## Comments, annotations, and file boundaries

| Construct | Current grammar rules / scanner | Existing corpus evidence | Status / next work |
| --- | --- | --- | --- |
| Top-level `;`, `#`, `*`, optional indentation | `top_comment` | `comments.txt`: hash, semicolon | Gap: `*` and indented top-level comments absent; reader `emptyorcommentlinep` supports both. Step 7. |
| `comment` / `end comment` blocks | `block_comment` | `comments.txt`: Block comment | Gap: grammar matches arbitrary substrings rather than whole delimiter lines; reader also allows block termination at EOF. Step 7. |
| Tags, empty values, commas | `tag_comment`, `tag_value`, external `value` in `src/scanner.c` | `tag.txt`: empty, comma-separated, value at EOL | Partial. Confirmed mismatch: scanner refuses a value starting with space/tab; reader skips whitespace after colon then reads and trims the value. Step 7. |
| Whitespace after tag colon | Same as above | `tag.txt`: Tag with without value; Real-world tag with space after colon | Existing expected trees encode the mismatch. Replace expectations when fixing scanner; `tag: this is not a value` has a value in 1.52. Step 7. |
| Blank/whitespace-only lines, trailing spaces | `source_file`, `_newline`; unused `_blank_line` | Ordinary blank lines throughout corpus | Gap: whitespace-only top-level lines have no production. Verify trailing spaces in each item type. Step 7. |
| CRLF, final line without newline | `_newline` accepts LF only; transactions require it | No explicit cases | Verify normalization performed by reader and grammar behavior per item type; no blanket claim that every reader production accepts EOF. Step 7. |
| Lot cost `{AMT}`, `{{AMT}}`, fixed `=`, empty braces | None | None | Gap: reader `lotcostp` accepts these; preserve delimiter structure. Step 8. |
| Lot date `[DATE]`, label `(TEXT)` | None after amount | None | Gap: reader `lotdatep`, `lotnotep`. Step 8. |
| Virtual costs `(@)` / `(@@)` | `cost` accepts only `@` / `@@` | None | Gap: reader `costp` accepts parenthesised forms. Step 8. |
| Valuation expression `((...))`, annotation order | None | None | Gap: reader accepts ignored valuation expressions and permutes optional annotations. Verify combinations/recovery before designing rules. Step 8. |

## Follow-through

- [x] Pin the target and compare current grammar and corpus with the versioned reader.
- [x] Keep existing work: initial `git status --short` contained only untracked `hledger-plan.md`; update it in place and add this audit.
- [ ] For each gap, add focused corpus cases during its implementation step, checking tree structure and comment/field ownership.
- [ ] Resolve Verify entries with reader helpers/tests and, where ambiguity remains, a 1.52 executable. Record exact examples and outcomes.
- [ ] Preserve working syntax: omitted amounts, costs, all assertion operators, assertion costs, Unicode names, and existing tags after correcting incompatible expectations.
- [ ] At step 9, test malformed/incomplete input, regenerate, run the corpus, and audit queries and Neovim integration.

No grammar, scanner, generated parser, or corpus files changed in this step. The first implementation milestone remains steps 2–4.

## Step 2 implementation verification

Ordinary headings now support secondary dates (`secondary_date` containing `date`), punctuation, and first-pipe payee/note splitting, including empty sides. Descriptions without a pipe retain the existing `note` node. Semicolons end descriptions regardless of spacing. Codes and description tokens cannot cross CR/LF boundaries. Incomplete codes recover as description text on their own line.

Spacing was checked against 1.52 `transactionp`, `statusp`, and `codep`: dates require a following whitespace character or newline; secondary dates immediately follow `=`; codes require preceding whitespace; description text may immediately follow status or code. `Transaction.hs` confirms that only the first pipe separates payee and note. Corpus coverage is in `transaction_headings.txt`, alongside the unchanged existing transaction corpus. The parser was regenerated with tree-sitter 0.25.10 and all 35 corpus cases pass. No hledger executable was available, so compatibility checks use the versioned reader source rather than executable comparisons. The original audit tables above record the pre-implementation state.
