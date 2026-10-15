-- Integration test with a real nvim-treesitter checkout and isolated data directory.
vim.opt.runtimepath:prepend(assert(vim.env.NVIM_TREESITTER))
vim.opt.runtimepath:prepend(vim.fn.getcwd())
require('nvim-treesitter').setup({ install_dir = assert(vim.env.HLEDGER_TEST_SITE) })
local plugin = require('hledger')
vim.api.nvim_buf_set_lines(0, 0, -1, false, {
  '2026-10-15 Example', '    assets:cash  1 USD', '    equity',
})
vim.bo.filetype = 'hledger'
plugin.setup()
assert(vim.filetype.match({ filename = 'example.journal' }) == 'hledger')
assert(vim.filetype.match({ filename = 'example.j' }) == 'hledger')
assert(vim.wait(60000, function()
  return vim.treesitter.highlighter.active[vim.api.nvim_get_current_buf()] ~= nil
end, 20), 'Installation did not activate highlighting in the existing buffer')
local parser = vim.treesitter.get_parser(0, 'hledger')
assert(not parser:parse()[1]:root():has_error())
assert(vim.treesitter.query.get('hledger', 'highlights'))
assert(vim.treesitter.query.get('hledger', 'folds'))
local info = require('nvim-treesitter.parsers').hledger.install_info
assert(info.path == vim.fn.getcwd())
local revision = vim.fn.readfile(vim.env.HLEDGER_TEST_SITE .. '/parser-info/hledger.revision')[1]
assert(revision == info.revision)
assert(require('nvim-treesitter').update({ 'hledger' }):wait(60000))
assert(require('nvim-treesitter.parsers').hledger.install_info.revision == revision)
plugin.setup({ install = false, highlight = false, filetypes = false })
assert(#vim.api.nvim_get_autocmds({ group = 'HledgerTreesitter' }) == 2)
print('Verified plugin installation, query loading, highlighting, updates, and repeated setup')
vim.cmd('qa!')
