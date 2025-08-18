/**
 * @file Hledger grammar for tree-sitter
 * @author Andrew42
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'hledger',

  conflicts: $ => [
    [$._cost_amount], [$.transaction_heading], [$.note, $.payee]
  ],

  extras: _ => [],

  rules: {
    source_file: $ => repeat(choice($.journal_item, $._newline)),

    journal_item: $ => choice(
      $.transaction,
      $.periodic_transaction,
      $.directive,
      $.block_comment,
      $.top_comment,
    ),

    // TODO: add autoposting

    periodic_transaction: $ => prec.left(seq(
      $.tilde,
      $._whitechar,
      $.period,
      optional(seq($._spacer, $.note)),
      optional($._sep_comment),
      $._newline,
      repeat($.posting),
    )),

    tilde: _ => '~',

    period: _ => /[a-zA-Z0-9-]+(?: [a-zA-Z0-9-]+)*/,

    transaction: $ => prec.left(seq(
      $.transaction_heading,
      optional($._sep_comment),
      $._newline,
      repeat($.posting),
    )),

    transaction_heading: $ => seq(
      $.date,
      optional(seq($._whitespace, $.status)),
      optional(seq($._whitespace, $.code)),
      optional(seq($._whitespace, $.payee, $._whitespace, '|')),
      optional(seq($._whitespace, $.note)),
    ),

    note: _ => token(/[^*!()|\s]+(?: [^*!()|\s]+)*/),

    status: _ => choice('*', '!'),

    code: _ => seq('(', /[^)]*/, ')'),

    posting: $ => seq(
      $._whitespace,
      choice(
        $.comment,
        seq(
          $.account,
          optional(
            seq(
              $._spacer,
              $._cost_amount,
              optional($._assert_amount)
            )
          ),
          optional($._sep_comment),
        )
      ),
      $._newline,
    ),

    _assert_amount: $ => seq($._whitespace, $.assert, $._whitespace, $._cost_amount),

    _cost_amount: $ => choice(
      seq($.amount, $._whitespace, $.cost, $._whitespace, $.amount),
      $.amount,
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

    tag: _ => /[^\s;]+/,

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

    payee: _ => token(/[^*!()|\s]+(?: [^*!()|\s]+)*/),

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
      /[^\s;]+/
    ),

    note_subdirective: $ => seq(
      'note',
      $._whitespace,
      /[^;\r\n]+/
    ),

    check_subdirective: $ => seq(
      'check',
      $._whitespace,
      /[^;\r\n]+/
    ),

    assert_subdirective: $ => seq(
      'assert',
      $._whitespace,
      /[^;\r\n]+/
    ),

    type_subdirective: $ => seq(
      'type',
      $._whitespace,
      choice('A', 'L', 'E', 'R', 'X', 'C', 'V')
    ),

    // Utilities
    // =========

    amount: $ => choice(
      seq($.commodity, optional($._whitechar), $.quantity),
      seq($.commodity, optional($._whitechar), $.neg_quantity),
      seq($.quantity, optional($._whitechar), $.commodity),
      seq($.neg_quantity, optional($._whitechar), $.commodity),
    ),

    quantity: _ => token(/[+]?\d+(?:[,. ]\d+)*/),
    neg_quantity: _ => token(/-\d+(?:[,. ]\d+)*/),

    commodity: _ => choice(
      token(/\p{L}+/u),        // Unicode letters with u flag
      token(/\p{Sc}/u),        // Unicode currency symbols with u flag
      token(/"[^"\n]*"/)       // Quoted strings (no u flag needed),
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

    _sep_comment: $ => seq($._spacer, optional($._whitespace), $.comment),

    // TODO: this comment can contain tags
    comment: _ => seq(';', token.immediate(repeat(/[^\n]/))),

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
