--[[
crossrefs.lua — resolve semantic cross-references and number floats.

Runs BEFORE citeproc on the command line. Pandoc parses both bibliographic citations ([@key]) and
our cross-references (@fig-x, @sec-x) into the same Cite element. This filter claims the Cites whose
id carries a cross-reference prefix (fig/sec/tbl/def/decision/tradeoff/ex/example/case/note/key) and
rewrites them; every other Cite is left untouched for citeproc to resolve as a real citation.

Numbering is owned by the renderer, never by the prose:
  * PDF (typst): a figure reference becomes a native Typst `@label`, so Typst numbers it.
  * Web  (md)  : a figure reference becomes a Markdown link whose text is "Figure N", where N is the
                 in-chapter sequence computed here; the link target is the figure's stable id.
Section references render by the section's title in both outputs — no hard-coded section numbers.
]]

local CROSSREF_PREFIX = {
  sec = true, fig = true, tbl = true, def = true, decision = true,
  tradeoff = true, ex = true, example = true, ["case"] = true, note = true, key = true,
}

local function ref_prefix(id)
  return id:match("^(%a+)%-")
end

function Pandoc(doc)
  -- Pass 1: collect float numbers and section titles.
  local fig_number = {}   -- id -> integer (in-chapter figure sequence)
  local tbl_number = {}   -- id -> integer
  local sec_title = {}    -- id -> plain-text heading title
  local fig_seq, tbl_seq = 0, 0

  doc:walk({
    Div = function(el)
      if el.classes:includes("figure") and el.identifier ~= "" then
        fig_seq = fig_seq + 1
        fig_number[el.identifier] = fig_seq
      elseif el.classes:includes("table") and el.identifier ~= "" then
        tbl_seq = tbl_seq + 1
        tbl_number[el.identifier] = tbl_seq
      end
    end,
    Table = function(el)
      if el.identifier ~= "" then
        tbl_seq = tbl_seq + 1
        tbl_number[el.identifier] = tbl_seq
      end
    end,
    Header = function(el)
      if el.identifier ~= "" and el.identifier:match("^sec%-") then
        sec_title[el.identifier] = pandoc.utils.stringify(el.content)
      end
    end,
  })

  -- Pass 2: stash the computed number on each figure/table Div (figures.lua reads it for the web
  -- caption) and rewrite cross-reference Cites.
  local out = doc:walk({
    Div = function(el)
      if el.classes:includes("figure") and fig_number[el.identifier] then
        el.attributes["data-number"] = tostring(fig_number[el.identifier])
        return el
      elseif el.classes:includes("table") and tbl_number[el.identifier] then
        el.attributes["data-number"] = tostring(tbl_number[el.identifier])
        return el
      end
    end,
    Cite = function(el)
      if #el.citations ~= 1 then return nil end
      local id = el.citations[1].id
      local p = ref_prefix(id)
      if not (p and CROSSREF_PREFIX[p]) then
        return nil -- a real bibliographic citation; leave it for citeproc
      end

      if FORMAT == "typst" then
        if p == "fig" or p == "tbl" then
          return pandoc.RawInline("typst", "@" .. id)
        end
        local label = sec_title[id] or id
        return pandoc.RawInline("typst", '#link(<' .. id .. '>)[#quote[' .. label .. ']]')
      else
        if p == "fig" or p == "tbl" then
          local n = (p == "fig") and fig_number[id] or tbl_number[id]
          local word = (p == "fig") and "Figure" or "Table"
          local text = n and (word .. " " .. n) or word
          return pandoc.Link(pandoc.Str(text), "#" .. id)
        end
        local label = sec_title[id] or id
        return pandoc.Link({ pandoc.Str("“" .. label .. "”") }, "#" .. id)
      end
    end,
  })
  return out
end
