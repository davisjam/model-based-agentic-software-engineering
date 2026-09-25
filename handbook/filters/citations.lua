--[[
citations.lua — project full bibliographic strings into READ FURTHER blocks.

Runs after crossrefs.lua and BEFORE --citeproc, and touches nothing outside a `read_further` block.

WHY IT EXISTS. A READ FURTHER entry prints the WHOLE reference — "Norman, Donald A. The Design of
Everyday Things. Revised and expanded. Basic Books, 2013." — while citeproc, configured with the
Handbook's author-date style, renders an inline cite as "(Norman 2013)". So the box cannot be fed by
citeproc. It is fed instead from the repo's one citation backend: book/references.bib, rendered once
to Chicago by book/render_citations.py and delivered here as a `handbook_citations` map that
build.py writes into the chapter directory it already injects everywhere. Bibliographic fact is
projected, never hand-typed into chapter prose.

WHY BEFORE CITEPROC. Pandoc's Lua `Citation` type carries no `locator` field: a locator rides
`citation.suffix`, and citeproc consumes it. Reading `[@winters2020, chaps. 9 and 11–14]` therefore
requires running first. crossrefs.lua runs early for the same kind of reason.

GRAMMAR. `[@key]`, or `[@key, <locator>]` where the locator is free text matching the course
landers' `locator:` field ("chaps. 9 and 11–14", "§2.1 and §2.8"). Several works in one paragraph
are several cites — the surrounding prose, including the commentary that ties them together, is
ordinary Markdown and is left exactly as written.

AUTHORING RULE. A projected entry ends in its own period, so write connective prose that leaves a
cite at a sentence boundary — "For the technique's origin: [@claessen2000quickcheck] For a
contemporary application: [@anthropic2026propertytesting]" — rather than mid-clause, which yields
"…268–79.; for a contemporary…".

An unknown key stops the build. A rotted reference must fail loud, not render blank.
]]

local PROJECTED = nil   -- key -> Inlines, built once from the document's metadata

local function load_projected(meta)
  local out = {}
  local m = meta["handbook_citations"]
  if m then
    for key, value in pairs(m) do
      -- --metadata-file parses a YAML string as Markdown, so the value arrives as Inlines with its
      -- emphasis and links already structured; a degenerate single-word value arrives as a string.
      if pandoc.utils.type(value) == "Inlines" then
        out[key] = value
      else
        out[key] = pandoc.Inlines({ pandoc.Str(tostring(value)) })
      end
    end
  end
  return out
end

--- Fold a locator into a rendered Chicago entry, the way the course site's reading hook does:
--- before the entry's closing period, so "…Basic Books, 2013." becomes "…Basic Books, 2013, chap. 2."
local function with_locator(inlines, locator)
  if locator == "" then return inlines end
  local out = inlines:clone()
  local last = out[#out]
  if last and last.t == "Str" and last.text:sub(-1) == "." then
    last.text = last.text:sub(1, -2)
  end
  out:insert(pandoc.Str(","))
  out:insert(pandoc.Space())
  -- Chicago sets the closing period INSIDE a quoted locator: chap. 2, "Modularity."  The locator is
  -- read back through pandoc's stringify, which has already applied smart quotes, so the closing mark
  -- is the curly ” (three UTF-8 bytes) rather than the straight " the author typed. Compared by
  -- explicit byte length — a Lua character class would split the multi-byte quote and truncate the
  -- string mid-sequence.
  local tail
  local CURLY = "\u{201D}"
  if locator:sub(-#CURLY) == CURLY then
    tail = locator:sub(1, -#CURLY - 1) .. "." .. CURLY
  elseif locator:sub(-1) == '"' then
    tail = locator:sub(1, -2) .. '."'
  else
    tail = locator .. "."
  end
  for _, inline in ipairs(pandoc.read(tail, "markdown").blocks[1].content) do
    out:insert(inline)
  end
  return out
end

--- The locator a Cite carries, read off its suffix: `[@key, chaps. 9 and 11–14]` → "chaps. 9 and 11–14".
local function locator_of(citation)
  local suffix = pandoc.utils.stringify(citation.suffix or {})
  return (suffix:gsub("^%s*,%s*", ""):gsub("%s+$", ""))
end

local function project(cite)
  local out = pandoc.Inlines({})
  for i, citation in ipairs(cite.citations) do
    local entry = PROJECTED[citation.id]
    if not entry then
      error("citations.lua: cite key '" .. citation.id .. "' has no rendered entry — add the work to "
            .. "book/references.bib and re-run `python3 book/render_citations.py`")
    end
    if i > 1 then out:insert(pandoc.Space()) end
    for _, inline in ipairs(with_locator(entry, locator_of(citation))) do
      out:insert(inline)
    end
  end
  return out
end

local READ_FURTHER = { read_further = true, ["read-further"] = true }

function Pandoc(doc)
  PROJECTED = load_projected(doc.meta)
  return doc:walk({
    Div = function(el)
      for _, class in ipairs(el.classes) do
        if READ_FURTHER[class] then
          return pandoc.walk_block(el, { Cite = project })
        end
      end
    end,
  })
end
