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
| Posting status | `posting`, `status` | `postings.txt`: Posting statuses; Combined posting fields and whitespace | Fixed in step 4: status is separate from the account, including compact status/account boundaries. |
| Account names, hierarchy, spaces, tab delimiter | `_real_account`, `account`, `_spacer` | `postings.txt`: Account boundaries; Tabs in account boundaries; Combined posting fields and whitespace | Fixed posting boundaries in step 4: single spaces/tabs remain in names, repeated whitespace delimits fields, later semicolons remain account text, and trailing whitespace is accepted. |
| Real / virtual / balanced virtual postings | `posting`, `virtual_account`, `balanced_virtual_account` | `postings.txt`: Posting types; Combined posting fields and whitespace; `periodic_transactions.txt` | Fixed in step 4: real accounts remain direct children; virtual wrappers contain an account node. |
| Unit/total costs (`@`, `@@`) | `_cost_amount`, `cost` | `postings.txt`: Compact costs and assertions; Assertion regression controls | Fixed compact boundaries in step 4; spaced forms preserved. |
| Assertion operators (`=`, `==`, `=*`, `==*`) | `_assert_amount`, `assert` | `postings.txt`: Compact costs and assertions; Assertion regression controls | All four operators covered with compact and spaced boundaries in step 4. |
| Balance assignments with omitted amount | `posting`, `_assert_amount` | `postings.txt`: Balance assignments; Combined posting fields and whitespace | Fixed in step 4: assertions are independent of explicit posting amounts. |
| Assertion costs | `_assert_amount`, `_cost_amount` | `postings.txt`: Assertion regression controls; Combined posting fields and whitespace | Preserved unit and total assertion costs, including compact forms. Cost basis remains step 8. |
| Continuation comments and ownership | `posting`, `tag_comment` | `postings.txt`: Continuation comment ownership; `transaction.txt`; `tag.txt` | Fixed in step 4: heading continuations belong to the transaction; posting continuations belong to the preceding posting. |
| Posting dates in comments (`date:`, `date2:`, bracket notation) | `tag_value` / generic comment text only | None | No explicit date structure; verify accepted forms with `postingcommentp` and decide whether date nodes are needed. Steps 4, 7. |

## Recurring and automatic rules

| Construct | Current grammar rules | Existing corpus evidence | Status / next work |
| --- | --- | --- | --- |
| Periodic expression and description | `periodic_transaction`, `period`, `note` | `recurring_rules.txt`: Slash/dot ranges, weekday lists, annual dates, relative periods | Fixed in step 5: preserve single-spaced period text up to the heading delimiter; calendar validation remains with hledger. |
| Periodic status, code, heading comments | `periodic_transaction` | `recurring_rules.txt`: Pending/cleared status, code, payee/note, heading and posting comments | Fixed in step 5: shared heading fields and tag-aware continuation comments. |
| Automatic query, quoted/multiple terms, comments | `auto_transaction`, `query` | `recurring_rules.txt`: Multiple terms, quoted text, rule and posting comments | Fixed in step 5: query text ends at semicolon/newline; query semantics remain with hledger. |
| No space after `~` / `=` | `periodic_transaction`, `auto_transaction` | `recurring_rules.txt`: Compact and multiple-space rule markers | Fixed in step 5: optional horizontal whitespace after either marker. |
| Multiplier and posting syntax in automatic rules | `autoposting`, `multiply`, `auto_amount` | `recurring_rules.txt`: Multipliers, statuses, wrappers, costs, assertions, assignments, missing amounts | Fixed in step 5: shared posting syntax; multiplier directly precedes the amount, matching the 1.52 reader. |

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

## Step 6 implementation verification

Directives now include default years (`Y`, `year`, `apply year`), default commodities (`D`), basic and regex aliases and their terminator, and nested account scope markers. Optional `!`/`@` prefixes apply to ordinary directives; market prices remain outside that wrapper. `end apply year` is accepted as an ignored terminator, matching the reader.

Commodity declarations support `format` subdirectives and arbitrary indented metadata. Account metadata retains existing named nodes while accepting additional or bare subdirectives; `type` is free text rather than a validated account type. Payee and tag declarations also own indented content. Payees permit quoted empty names and pipes. Include arguments are preserved as line-bound path text, including spaces, globs, and reader prefixes. Price directives support compact `P` markers and optional HH:MM[:SS] times with signed four-digit timezone offsets.

All directive arguments stop at line boundaries, and directives consume their line endings and trailing horizontal whitespace. Corpus coverage: 13 new cases in `directives.txt`; all 86 corpus cases pass, and `test.journal` parses without errors. Compatibility was checked against the locally retained 1.52 reader sources; no hledger executable comparison was performed. Calendar, amount-format, alias-regex, and accounting validation remain outside this syntax grammar. CRLF and missing final newlines remain step 7.
