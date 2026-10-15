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
  ],

  conflicts: $ => [
    [$.amount],
    [$._cost_amount],
    [$._whitespace, $._spacer],
  ],

  extras: _ => [],

  rules: {
    source_file: $ => repeat(choice($.journal_item, $._newline)),

    journal_item: $ => choice(
      $.transaction,
      $.periodic_transaction,
      $.auto_transaction,
      $.directive,
      $.block_comment,
      $.top_comment,
    ),

    auto_transaction: $ => prec.left(seq(
      $.match,
      optional($._whitespace),
      optional($.query),
      optional($.tag_comment),
      $._newline,
      repeat($._continuation_comment),
      repeat($.autoposting),
    )),

    match: _ => '=',

    query: _ => token(/[^;\r\n\s][^;\r\n]*/u),

    autoposting: $ => postingRule($, true),

    auto_amount: $ => $.amount,

    multiply: _ => '*',

    periodic_transaction: $ => prec.left(seq(
      $.tilde,
      optional($._whitespace),
      $.period,
      optional(choice(seq($._spacer, headingFields($)), $._whitechar)),
      optional($.tag_comment),
      $._newline,
      repeat($._continuation_comment),
      repeat($.posting),
    )),

    tilde: _ => '~',

    // hledger reads single-spaced text, then validates the period expression.
    period: _ => token(/[^;\s]+(?: [^;\s]+)*/u),

    transaction: $ => prec.left(seq(
      $.transaction_heading,
      optional($.tag_comment),
      $._newline,
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
      alias($._indented_tag_comment, $.tag_comment), $._newline,
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

    directive: $ => choice(
      $.include_directive,
      $.decimal_mark_directive,
      $.tag_directive,
      $.commodity_directive,
      $.price_directive,
      $.payee_directive,
      $.account_directive,
    ),

    include_directive: $ => seq(
      'include',
      $._whitespace,
      $.file_path,
      optional($._sep_comment),
    ),

    decimal_mark_directive: $ => seq(
      'decimal-mark',
      $._whitespace,
      choice('.', ','),
      optional($._sep_comment),
    ),

    tag_directive: $ => seq(
      'tag',
      $._whitespace,
      $.tag,
      optional($._sep_comment),
    ),

    tag: $ => $._word,

    commodity_directive: $ => prec(1, seq(
      'commodity',
      $._whitespace,
      choice(
        $.commodity,
        $.amount
      ),
      optional($._sep_comment),
    )),

    price_directive: $ => seq(
      'P',
      $._whitespace,
      $.date,
      $._whitespace,
      $.commodity,
      $._whitespace,
      $.amount,
      optional($._sep_comment),
    ),

    payee_directive: $ => seq(
      'payee',
      $._whitespace,
      $.payee,
      optional($._sep_comment),
    ),

    payee: _ => token(/[^;|\r\n\s][^;|\r\n]*/),

    account_directive: $ => prec.left(seq(
      'account',
      $._whitespace,
      $.account,
      optional($._sep_comment),
      $._newline,
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
        $.comment
      ),
      $._newline
    ),

    alias_subdirective: $ => seq(
      'alias',
      $._whitespace,
      /[^\s;]+/,
      optional($._sep_comment)
    ),

    note_subdirective: $ => seq(
      'note',
      $._whitespace,
      /[^;\r\n]+/,
      optional($._sep_comment)
    ),

    check_subdirective: $ => seq(
      'check',
      $._whitespace,
      /[^;\r\n]+/,
      optional($._sep_comment)
    ),

    assert_subdirective: $ => seq(
      'assert',
      $._whitespace,
      /[^;\r\n]+/,
      optional($._sep_comment)
    ),

    type_subdirective: $ => seq(
      'type',
      $._whitespace,
      choice('A', 'L', 'E', 'R', 'X', 'C', 'V'),
      optional($._sep_comment)
    ),

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

    date: $ => choice(
      seq($._4d, $._dsep, $._2d, $._dsep, $._2d),
      seq($._2d, $._dsep, $._2d, $._dsep, $._2d),
      seq($._2d, $._dsep, $._2d),
    ),
    _dsep: _ => token(/[-\.\/]/),
    _2d: _ => token(/\d{1,2}/),
    _4d: _ => token(/\d{4}/),

    // File path
    // =========

    file_path: $ => choice(
      $._absolute_path,
      $._relative_path,
    ),

    _absolute_path: $ => seq(
      choice('/', /[A-Za-z]:[\\\/]/), // Root or drive
      optional($._path_segments)
    ),

    _relative_path: $ => seq(
      optional(choice('./', '../')),
      $._path_segments
    ),

    _path_segments: _ => seq(
      /[^\s\\\/]+/,                       // First path segment
      repeat(seq(/[\\\/]/, /[^\s\\\/]+/)) // Separator + additional segments
    ),

    // COMMENTS
    // ========

    // only top comment can also start with #
    top_comment: _ => seq(choice(';', '#'), token.immediate(repeat(/[^\n]/))),

    _sep_comment: $ => seq($._spacer, $.comment),

    comment: _ => seq(';', token.immediate(repeat(/[^\n]/))),

    _sep_tag_comment: $ => seq($._spacer, $.tag_comment),

    tag_comment: $ => seq(
      ';',
      optional($._tag_comment_contents),
    ),

    _tag_comment_contents: $ => repeat1(choice(
      $._word,
      $.tag_value,
      ';',
      $._whitespace,
    )),

    _word: _ => token(/[^\s;:]+/),

    tag_value: $ => prec.right(seq($.tag, ':', optional($.value))),

    block_comment: _ => seq(
      'comment',
      repeat(choice(
        token(/[^\n\r]+/),  // Any line content except newlines
        choice(/\n/, /\r/, /\r\n/)   // Newlines
      )),
      `end comment`,
    ),

    _whitechar: _ => choice(' ', '\t'),
    _newline: _ => /\n/,
    _blank_line: $ => seq(optional($._whitespace), $._newline),
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
    $._newline,
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
