# The Software Engineering Handbook — build commands.
#
# One semantic manuscript (chapters/*.md) drives two renderers. Targets have boring, predictable
# names; each FAILS on a manuscript error rather than degrading silently. See README.md.

PY := python3
SCRIPTS := scripts
MKDOCS := ../site/.venv/bin/mkdocs

.PHONY: all lint book web serve clean

all: lint book web            ## lint, then render PDF + web

lint:                         ## validate manuscript semantics (no rendering)
	$(PY) $(SCRIPTS)/lint.py

book:                         ## render dist/software-engineering-handbook.pdf
	$(PY) $(SCRIPTS)/build.py pdf

web:                          ## build the MkDocs site into dist/site/
	$(PY) $(SCRIPTS)/build.py web

serve: web                    ## build, then serve the web edition locally
	$(MKDOCS) serve -f web/mkdocs.yml

clean:                        ## remove all generated artifacts
	rm -rf generated/typst/* generated/web/* dist/*
