/**
 * @file Hledger grammar for tree-sitter
 * @author Andrew42
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// A single grouping space belongs to a number; repeated spaces delimit fields.
const groupingSpaces = [' ', '\u00a0', '\u2002', '\u2003', '\u2008', '\u2009', '\u202f', '\u205f'];
const decimalNumber = '(?:[0-9]+(?:[.,][0-9]*)?|[.,][0-9]+)';
const exponent = '(?:[eE](?:[+-][ \\t]*)?[0-9]+)?';
const groupedNumbers = [
  '[0-9]+(?:,[0-9]+)+(?:\\.[0-9]*)?',
  '[0-9]+(?:\\.[0-9]+)+(?:,[0-9]*)?',
  ...groupingSpaces.map(space => `[0-9]+(?:${space}[0-9]+)+(?:[.,][0-9]*)?`),
];
const number = `(?:${decimalNumber}${exponent}|${groupedNumbers.join('|')})`;

module.exports = grammar({
  name: 'hledger',

  externals: $ => [
    $.value,
    $._error_sentinel,
    $._eof,
    $.block_comment_body,
    $._blank_eof,
    $.block_comment_end,
  ],

  conflicts: $ => [
    [$.amount],
    [$._cost_amount],
    [$._whitespace, $._spacer],
    [$.tag_directive],
    [$.payee_directive],
  ],

  extras: _ => [],

  rules: {
    source_file: $ => repeat(choice($.journal_item, $._blank_line, $._blank_eof)),

    journal_item: $ => choice(
      $.transaction,
      $.periodic_transaction,
      $.auto_transaction,
      $.directive,
      $.block_comment,
      $.top_comment,
    ),

    auto_transaction: $ => prec.right(seq(
      $.match,
      optional($._whitespace),
      optional($.query),
      optional($.tag_comment),
      $._line_end,
      repeat($._continuation_comment),
      repeat($.autoposting),
    )),

    match: _ => '=',

    query: _ => token(/[^;\r\n\s][^;\r\n]*/u),

    autoposting: $ => postingRule($, true),

    auto_amount: $ => $.amount,

    multiply: _ => '*',

    periodic_transaction: $ => prec.right(seq(
      $.tilde,
      optional($._whitespace),
      $.period,
      optional(choice(seq($._spacer, headingFields($)), $._whitechar)),
      optional($.tag_comment),
      $._line_end,
      repeat($._continuation_comment),
      repeat($.posting),
    )),

    tilde: _ => '~',

    // hledger reads single-spaced text, then validates the period expression.
    period: _ => token(/[^;\s]+(?: [^;\s]+)*/u),

    transaction: $ => prec.right(seq(
      $.transaction_heading,
      optional($.tag_comment),
      $._line_end,
      repeat($._continuation_comment),
      repeat($.posting),
    )),

    transaction_heading: $ => seq(
      $.date,
      optional($.secondary_date),
      optional(seq($._whitespace, headingFields($))),
    ),

    secondary_date: $ => seq('=', $.date),

    _description_note: _ => token(/[^;|\r\n\s][^;|\r\n]*/),

    note: _ => token(/[^;\r\n]+/),

    status: _ => token(prec(3, choice('*', '!'))),

    code: _ => token(prec(2, /\([^\)\r\n]*\)/)),

    posting: $ => postingRule($, false),

    // A single space or tab belongs to the name; repeated whitespace ends it.
    _real_account: _ => token(/[^;*!(\[\s][^\s]*(?:[^\S\r\n][^\s]+)*/u),

    virtual_account: $ => seq(
      '(', alias($._virtual_account_name, $.account), ')',
    ),

    balanced_virtual_account: $ => seq(
      '[', alias($._balanced_account_name, $.account), ']',
    ),

    _virtual_account_name: _ => token(/[^\s)]+(?:[^\S\r\n][^\s)]+)*/u),
    _balanced_account_name: _ => token(/[^\s\]]+(?:[^\S\r\n][^\s\]]+)*/u),

    _continuation_comment: $ => seq(
      alias($._indented_tag_comment, $.tag_comment), $._line_end,
    ),

    // Include the semicolon in this token so indentation alone cannot consume
    // the start of the next posting while looking for a continuation comment.
    _indented_tag_comment: $ => seq(token(/[ \t]+;/), optional($._tag_comment_contents)),

    _assert_amount: $ => seq(
      optional($._whitespace), $.assert, optional($._whitespace), $._cost_amount,
    ),

    _cost_amount: $ => seq(
      $.amount,
      optional(seq(optional($._whitespace), $.cost, optional($._whitespace), $.amount)),
    ),

    cost: _ => token(choice('@@', '@')),

    assert: _ => token(choice('==*', '==', '=*', '=')),

    // Directives
    // ==========

    // Market prices are dispatched separately and do not accept !/@ prefixes.
    directive: $ => choice(
      $.price_directive,
      seq(
        optional(choice('!', '@')),
        choice(
          $.include_directive,
          $.decimal_mark_directive,
          $.tag_directive,
          $.commodity_directive,
          $.payee_directive,
          $.account_directive,
          $.default_year_directive,
          $.default_commodity_directive,
          $.alias_directive,
          $.end_aliases_directive,
          $.apply_account_directive,
          $.end_apply_account_directive,
          $.end_apply_year_directive,
        ),
      ),
    ),

    include_directive: $ => seq(
      'include',
      $._whitespace,
      $.file_path,
      optional($._directive_comment),
      $._directive_eol,
    ),

    decimal_mark_directive: $ => seq(
      'decimal-mark',
      $._whitespace,
      choice('.', ','),
      optional($._directive_comment),
      $._directive_eol,
    ),

    tag_directive: $ => seq(
      'tag',
      $._whitespace,
      $.tag,
      optional($._directive_comment),
      $._directive_eol,
      repeat($.directive_content),
    ),

    // Directive names use whitespace boundaries; comment tags have their own rule.
    tag: _ => token(/[^\s]+/u),

    commodity_directive: $ => prec.right(seq(
      'commodity',
      $._whitespace,
      choice(
        $.commodity,
        $.amount
      ),
      optional($._directive_comment),
      $._directive_eol,
      repeat($.commodity_subdirective),
    )),

    price_directive: $ => seq(
      'P',
      optional($._whitespace),
      $.date,
      optional(seq($._whitespace, $.time)),
      $._whitespace,
      $.commodity,
      $._whitespace,
      $.amount,
      optional($._directive_comment),
      $._directive_eol,
    ),

    payee_directive: $ => seq(
      'payee',
      $._whitespace,
      alias($._directive_payee, $.payee),
      optional($._directive_comment),
      $._directive_eol,
      repeat($.directive_content),
    ),

    payee: _ => token(/[^;|\r\n\s][^;|\r\n]*/),

    account_directive: $ => prec.right(seq(
      'account',
      $._whitespace,
      $.account,
      optional($._directive_comment),
      $._directive_eol,
      repeat($.account_subdirective)
    )),

    account: _ => token(/[^;\s]+(?: \S+)*/),

    account_subdirective: $ => seq(
      $._whitespace,
      choice(
        $.alias_subdirective,
        $.note_subdirective,
        $.check_subdirective,
        $.assert_subdirective,
        $.type_subdirective,
        $.comment,
        alias($._directive_content_text, $.directive_content),
      ),
      $._directive_eol
    ),

    alias_subdirective: $ => prec.right(seq(
      'alias',
      optional(seq($._whitespace, /[^;\r\n]+/u)),
      optional($._directive_comment)
    )),

    note_subdirective: $ => prec.right(seq(
      'note',
      optional(seq($._whitespace, /[^;\r\n]+/u)),
      optional($._directive_comment)
    )),

    check_subdirective: $ => prec.right(seq(
      'check',
      optional(seq($._whitespace, /[^;\r\n]+/u)),
      optional($._directive_comment)
    )),

    assert_subdirective: $ => prec.right(seq(
      'assert',
      optional(seq($._whitespace, /[^;\r\n]+/u)),
      optional($._directive_comment)
    )),

    type_subdirective: $ => prec.right(seq(
      'type',
      optional(seq($._whitespace, /[^;\r\n]+/u)),
      optional($._directive_comment)
    )),

    // Utilities
    // =========

    amount: $ => choice(
      seq(
        optional($.sign),
        $.commodity,
        optional($._whitespace),
        choice($.quantity, $.neg_quantity),
      ),
      seq(
        choice($.quantity, $.neg_quantity),
        optional(seq(optional($._whitespace), $.commodity)),
      ),
    ),

    sign: _ => token(/[+-][ \t]*/),

    quantity: _ => token(new RegExp(`(?:\\+[ \\t]*)?${number}`, 'u')),
    neg_quantity: _ => token(new RegExp(`-[ \\t]*${number}`, 'u')),

    commodity: _ => choice(
      token(/[^\p{Nd}\-+.@*;\t\r\n "{}=]+/u),
      token(/"[^";\r\n]*"/u),
    ),

    // Keep legacy short-year dates; calendar validation belongs to hledger.
    date: _ => token(choice(
      /(?:[0-9]{4}[0-9]*|[0-9]{1,2})[-./][0-9]+[-./][0-9]+/u,
      /[0-9]{1,3}[-./][0-9]+/u,
    )),

    // Directive arguments are line-bound; include paths are not shell words.
    file_path: _ => token(/[^;\s][^;\r\n]*/u),

    _directive_payee: _ => token(choice(/"[^"\r\n]*"/u, /[^;\s][^;\r\n]*/u)),

    _directive_eol: $ => seq(optional($._whitespace), $._line_end),

    _directive_comment: $ => seq(optional($._whitespace), $.comment),

    _directive_content_text: _ => token(prec(-1, /[^\s][^\r\n]*/u)),

    // Recognize familiar metadata keywords without restricting ignored content.
    directive_content: $ => seq(
      $._whitespace, $._directive_metadata, $._directive_eol,
    ),

    _directive_metadata: $ => choice(
      $.alias_subdirective,
      $.note_subdirective,
      $.check_subdirective,
      $.assert_subdirective,
      $.type_subdirective,
      $.comment,
      $._directive_content_text,
    ),

    commodity_subdirective: $ => seq(
      $._whitespace,
      choice(
        $.format_subdirective,
        $.alias_subdirective,
        $.note_subdirective,
        $.check_subdirective,
        $.assert_subdirective,
        $.type_subdirective,
        $.comment,
        alias($._directive_content_text, $.directive_content),
      ),
      $._directive_eol,
    ),

    format_subdirective: $ => prec.right(seq(
      'format', $._whitespace, $.amount, optional($._directive_comment),
    )),

    default_year_directive: $ => seq(
      choice('Y', 'year', 'apply year'), optional($._whitespace),
      $.year, optional($._directive_comment), $._directive_eol,
    ),

    year: _ => token(/[0-9]{4}[0-9]*/u),

    default_commodity_directive: $ => seq(
      'D', $._whitespace, $.amount, optional($._directive_comment), $._directive_eol,
    ),

    alias_directive: $ => seq(
      'alias', $._whitespace, $.alias_pattern, '=',
      optional($.alias_replacement), $._directive_eol,
    ),

    alias_pattern: _ => token(choice(
      /\/(?:[^/\\\r\n]|\\[^\r\n])+\/[ \t]*/u,
      /[^=\r\n]+/u,
    )),
    alias_replacement: _ => token(/[^\r\n]+/u),

    end_aliases_directive: $ => seq('end', $._whitespace, 'aliases', $._directive_eol),

    apply_account_directive: $ => seq(
      'apply', $._whitespace, 'account', $._whitespace, $.account, $._directive_eol,
    ),

    end_apply_account_directive: $ => seq(
      'end', $._whitespace, 'apply', $._whitespace, 'account', $._directive_eol,
    ),
    end_apply_year_directive: $ => seq('end apply year', $._directive_eol),

    time: _ => token(/[0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:[+-][0-9]{4})?/u),

    // COMMENTS
    // ========

    // Prefer posting/status and continuation tokens when inside an entry.
    top_comment: $ => prec(-1, seq(optional($._whitespace), token(prec(-2, /[;#*][^\r\n]*/u)))),

    _sep_comment: $ => seq($._spacer, $.comment),

    comment: _ => token(/;[^\r\n]*/u),

    _sep_tag_comment: $ => seq($._spacer, $.tag_comment),

    tag_comment: $ => seq(
      ';',
      optional($._tag_comment_contents),
    ),

    _tag_comment_contents: $ => repeat1(choice(
      $._comment_word,
      $.tag_value,
      ';',
      ',',
      ':',
      $._whitespace,
    )),

    _word: _ => token(/[^\s;:]+/u),
    _comment_word: _ => token(/[^\s:]+/u),
    _comment_tag: $ => prec(1, alias($._comment_word, $.tag)),

    tag_value: $ => prec.right(seq($._comment_tag, ':', optional($.value))),

    block_comment: $ => seq(
      $.block_comment_start,
      optional($.block_comment_body),
      choice($.block_comment_end, $._eof),
    ),

    block_comment_start: _ => token(/comment[ \t]*\r?\n/u),

    _whitechar: _ => choice(' ', '\t'),
    _newline: _ => /\r?\n/,
    _line_end: $ => choice($._newline, $._eof),
    _blank_line: _ => token(/[ \t]*\r?\n/u),
    _whitespace: $ => choice($._whitechar, $._spacer),
    _spacer: $ => prec.right(seq($._whitechar, repeat1($._whitechar))),
    _alphanum: _ => /[a-zA-Z0-9]/,
  }
});

/** Build the shared posting syntax, enabling multipliers in automatic rules. */
function postingRule($, automatic) {
  return prec.right(seq(
    $._whitespace,
    optional(seq($.status, optional($._whitespace))),
    choice(
      alias($._real_account, $.account),
      $.virtual_account,
      $.balanced_virtual_account,
    ),
    optional(seq(
      $._spacer,
      choice(
        seq(
          ...(automatic ? [
            optional($.multiply),
            $.auto_amount,
            optional(seq(optional($._whitespace), $.cost, optional($._whitespace), $.amount)),
          ] : [$._cost_amount]),
          optional($._assert_amount),
        ),
        $._assert_amount,
      ),
    )),
    optional($._whitespace),
    optional($.tag_comment),
    $._line_end,
    repeat($._continuation_comment),
  ));
}

/** Build the shared optional status, code, and description fields. */
function headingFields($) {
  return seq(
    optional(choice(
      seq($.status, optional(seq($._whitespace, $.code))),
      $.code,
    )),
    optional($._whitespace),
    optional(choice(
      seq(optional($.payee), '|', optional($.note)),
      alias($._description_note, $.note),
    )),
    optional($._whitespace),
  );
}
