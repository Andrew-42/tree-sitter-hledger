; Keywords
[
  "decimal-mark"
  "comment"
  "end comment"
  "account"
  "tag"
  "commodity"
  "P"
  "payee"
  "alias"
  "Y"
  "year"
  "apply year"
  "end apply year"
  "D"
  "end aliases"
  "apply account"
  "end apply account"
  "format"
  "note"
  "check"
  "assert"
  "type"
  (tilde)
  (match)
] @keyword

[
  (cost)
  (assert)
  (multiply)
] @operator

(directive ["!" "@"] @operator)
(alias_directive "=" @operator)

"include" @keyword.import
(file_path) @constant

(quantity) @number
(neg_quantity) @number
(year) @number

[
  (date)
  (time)
  (period)
  (query)
] @string.special

; Account names
[
  (tag)
  (account)
] @variable.member

(commodity) @string
(payee_directive (payee) @string)
(alias_pattern) @string.regexp
(alias_replacement) @string

(status) @variable.parameter
(code) @string.escape

; Comments
[
  (comment)
  (tag_comment)
  (top_comment)
  (block_comment)
] @comment

(value) @number
