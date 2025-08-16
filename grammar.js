/**
 * @file Hledger grammar for tree-sitter
 * @author Andrew42
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'hledger',

  rules: {
    source_file: $ => repeat(choice($.journal_item, $._blank_line)),

    journal_item: $ => choice(
      $.transaction,
      $.directive,
      $.block_comment,
      $.top_comment,
    ),

    transaction: $ => seq(
      $.date,
      $.transaction_heading,
      optional($._sep_comment),
      optional($._newline),
      repeat($.posting)
    ),

    transaction_heading: $ => seq(
      optional(seq($._whitespace, $.status)),
      optional(seq($._whitespace, $.code)),
      optional(seq($._whitespace, $.payee, $._whitespace, '|')),
      seq($._whitespace, $.note),
    ),

    note: _ => /[^;\r\n\s]+( [^;\r\n\s]+)*/,

    status: _ => choice('*', '!'),

    code: _ => seq('(', /[^)]*/, ')'),

    posting: $ => seq(
      $._indent,
      choice(
        $.comment,
        seq(
          optional(seq($.status, $._whitespace)),
          $.account,
          optional(seq($._separator, $.amount)),
          optional($._sep_comment),
        )
      ),
      optional($._newline),
    ),

    payee2: _ => /[^(*!\S;][^\n;]*/,

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
      optional($._newline),
    ),

    decimal_mark_directive: $ => seq(
      'decimal-mark',
      $._whitespace,
      choice('.', ','),
      optional($._sep_comment),
      optional($._newline),
    ),

    tag_directive: $ => seq(
      'tag',
      $._whitespace,
      $.tag,
      optional($._sep_comment),
      optional($._newline),
    ),

    tag: _ => /[^\s; ]+/,

    commodity_directive: $ => seq(
      'commodity',
      $._whitespace,
      choice(
        $.commodity,
        $.amount
      ),
      optional($._sep_comment),
      optional($._newline),
    ),

    price_directive: $ => seq(
      'P',
      $._whitespace,
      $.date,
      $._whitespace,
      $.commodity,
      $._whitespace,
      $.amount,
      optional($._sep_comment),
      optional($._newline),
    ),

    payee_directive: $ => seq(
      'payee',
      $._whitespace,
      $.payee,
      optional($._sep_comment),
      optional($._newline),
    ),

    payee: _ => /[^\r\n\s]+( [^\r\n\s]+)*/,

    account_directive: $ => seq(
      'account',
      $._whitespace,
      $.account,
      optional($._sep_comment),
      optional($._newline),
      repeat($.account_subdirective)
    ),

    account: _ => /[^;\r\n\s]+( [^;\r\n\s]+)*/,

    account_subdirective: $ => seq(
      $._indent,
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
      seq($.commodity, optional(' '), $.quantity),
      seq($.commodity, optional(' '), $.neg_quantity),
      seq($.quantity, optional(' '), $.commodity),
      seq($.neg_quantity, optional(' '), $.commodity),
    ),

    quantity: _ => token(/[+]?\d([\d., ]*\d)?/),
    neg_quantity: _ => token(/-\d([\d., ]*\d)?/),

    commodity: _ => choice(
      /\p{L}+/u,        // Unicode letters with u flag
      /\p{Sc}/u,        // Unicode currency symbols with u flag
      /"[^"\n]*"/       // Quoted strings (no u flag needed),
    ),

    date: $ => $._single_date,

    _single_date: $ => choice(
      seq($._4d, $._dsep, $._2d, $._dsep, $._2d),
      seq($._2d, $._dsep, $._2d, $._dsep, $._2d),
      seq($._2d, $._dsep, $._2d),
    ),
    _dsep: _ => /[-\.\/]/,
    _2d: _ => /\d{1,2}/,
    _4d: _ => /\d{4}/,

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

    top_comment: $ => seq(
      choice(';', '#'),
      /[^\r\n]*/,
      optional($._newline)
    ),

    _sep_comment: $ => seq(
      /[ \t][ \t]+/,  // Require at least 2 spaces before comment
      $.comment // TODO: this comment can contain tags
    ),

    comment: _ => seq(
      ';',
      /[^\r\n]*/
    ),

    block_comment: _ => seq(
      'comment',
      repeat(/[^\r\n]*/), // BUG: incorrect when "end comment" is missing
      optional('end comment')
    ),

    _separator: _ => /[ \t][ \t]+/,  // 2 spaces separator
    _blank_line: _ => /\s*\r?\n/,
    _whitespace: _ => /[ \t]+/,
    _newline: _ => /\r?\n/,
    _indent: _ => /[ \t]+/
  }
});
