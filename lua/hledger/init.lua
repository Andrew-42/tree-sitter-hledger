local M = {}
local root = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":p:h:h:h")

--- Configure the bundled parser using nvim-treesitter's main-branch API.
function M.setup(opts)
	opts = vim.tbl_extend("force", {
		install = true,
		highlight = true,
		filetypes = true,
	}, opts or {})
	local ok, treesitter = pcall(require, "nvim-treesitter")
	if not ok or type(treesitter.update) ~= "function" then
		error("hledger requires nvim-treesitter (main branch); see the README installation instructions")
	end

	-- Include the checkout path so moving the plugin also refreshes query links.
	local sources = { root }
	for _, path in ipairs({
		"src/parser.c",
		"src/scanner.c",
		"src/tree_sitter/parser.h",
		"src/tree_sitter/alloc.h",
		"src/tree_sitter/array.h",
	}) do
		sources[#sources + 1] = table.concat(vim.fn.readfile(root .. "/" .. path, "b"), "\n")
	end
	local revision = vim.fn.sha256(table.concat(sources, "\n"))
	local function register()
		require("nvim-treesitter.parsers").hledger = {
			install_info = { path = root, revision = revision, queries = "queries" },
		}
	end

	local group = vim.api.nvim_create_augroup("HledgerTreesitter", { clear = true })
	vim.api.nvim_create_autocmd("User", {
		group = group,
		pattern = "TSUpdate",
		callback = register,
	})
	register()
	vim.treesitter.language.register("hledger", "hledger")
	if opts.filetypes then
		vim.filetype.add({ extension = { journal = "hledger", j = "hledger" } })
	end

	local function start(buf)
		if opts.highlight and vim.api.nvim_buf_is_valid(buf) and vim.bo[buf].filetype == "hledger" then
			-- The parser may still be installing on the first startup.
			local loaded, available = pcall(vim.treesitter.language.add, "hledger")
			if loaded and available then
				vim.treesitter.start(buf, "hledger")
			end
		end
	end
	local function start_buffers()
		for _, buf in ipairs(vim.api.nvim_list_bufs()) do
			start(buf)
		end
	end
	vim.api.nvim_create_autocmd("FileType", {
		group = group,
		pattern = "hledger",
		callback = function(args)
			start(args.buf)
		end,
	})
	start_buffers()
	if opts.install then
		local installed = vim.list_contains(treesitter.get_installed("parsers"), "hledger")
		local task
		if installed then
			task = treesitter.update({ "hledger" })
		else
			task = treesitter.install({ "hledger" }, { force = true })
		end
		task:await(function(err, success)
			vim.schedule(function()
				if err or not success then
					vim.notify(
						"hledger parser installation failed; see :checkhealth nvim-treesitter and retry :TSInstall hledger",
						vim.log.levels.ERROR
					)
				else
					start_buffers()
				end
			end)
		end)
	end
end

return M
