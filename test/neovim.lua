-- Run from the repository root with HLEDGER_PARSER pointing to a compiled library.
vim.opt.runtimepath:prepend(vim.fn.getcwd())
vim.treesitter.language.add('hledger', { path = assert(vim.env.HLEDGER_PARSER) })
vim.filetype.add({ extension = { journal = 'hledger', j = 'hledger' } })
assert(vim.filetype.match({ filename = 'example.journal' }) == 'hledger')
assert(vim.treesitter.query.get('hledger', 'highlights'))
local lines = {
  'comment', 'Block body', 'end comment', '',
  '2026-10-15 Example', '    assets:cash  1 USD', '    equity', '',
  '~ monthly', '    expenses:rent  1 USD', '    assets:cash', '',
  '= expenses', '    assets:cash  *-1', '',
  'account assets:cash', '    note Cash account', '',
  'commodity USD', '    format 1,000.00 USD', '',
  'payee Example', '    alias Example.*', '',
  'tag project', '    note Project metadata', '',
  'account equity', '', 'commodity EUR', '', 'payee Other', '', 'tag other',
}
vim.api.nvim_buf_set_lines(0, 0, -1, false, lines)
vim.treesitter.language.register('hledger', 'hledger')
vim.bo.filetype = 'hledger'
local parser = vim.treesitter.get_parser(0, 'hledger')
local tree = parser:parse()[1]
assert(not tree:root():has_error(), 'Fixture has parse errors')
local highlights = assert(vim.treesitter.query.get('hledger', 'highlights'))
local highlighted = {}
for id, node in highlights:iter_captures(tree:root(), 0) do
  highlighted[node:type() .. ':' .. highlights.captures[id]] = true
end
for _, capture in ipairs({
  'date:string.special', 'quantity:number', 'account:variable.member',
  'commodity:string', 'block_comment_start:keyword', 'block_comment_end:keyword',
}) do
  assert(highlighted[capture], 'Missing highlight: ' .. capture)
end
local query = assert(vim.treesitter.query.get('hledger', 'folds'))
local counts = {}
for _, node in query:iter_captures(tree:root(), 0) do
  counts[node:type()] = (counts[node:type()] or 0) + 1
end
for _, name in ipairs({'block_comment', 'transaction', 'periodic_transaction', 'auto_transaction'}) do
  assert(counts[name] == 1, name .. ': incorrect capture count')
end
for _, name in ipairs({'account_directive', 'commodity_directive', 'payee_directive', 'tag_directive'}) do
  assert(counts[name] == 2, name .. ': incorrect capture count')
end
vim.wo.foldmethod = 'expr'
vim.wo.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
vim.wo.foldenable = true
vim.wo.foldminlines = 1
vim.o.columns = 120
vim.o.lines = 50
vim.wo.foldlevel = 0
vim.cmd('normal! zx')
vim.cmd('normal! zM')
vim.wait(1000, function() return vim.fn.foldclosed(1) == 1 end, 10)
vim.cmd('normal! zx')
vim.cmd('normal! zM')
for _, range in ipairs({{1,3}, {5,7}, {9,11}, {13,14}, {16,17}, {19,20}, {22,23}, {25,26}}) do
  assert(vim.fn.foldclosed(range[1]) == range[1], 'Missing fold at line ' .. range[1])
  assert(vim.fn.foldclosedend(range[1]) == range[2], 'Incorrect fold end at line ' .. range[1])
end
for _, line in ipairs({28,30,32,34}) do
  assert(vim.fn.foldlevel(line) == 0, 'Single-line declaration folded at line ' .. line)
end
print('Verified all eight fold types, exact fold ranges, and unfolded single-line declarations')
vim.cmd('qa!')
