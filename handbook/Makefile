# The Software Engineering Handbook — build commands.
#
# One semantic manuscript (chapters/*.md) drives two renderers. Targets have boring, predictable
# names; each FAILS on a manuscript error rather than degrading silently. See README.md.

PY := python3
SCRIPTS := scripts
MKDOCS := ../site/.venv/bin/mkdocs

.PHONY: all lint book epub web serve clean

all: lint book web            ## lint, then render PDF + ePub + web

lint:                         ## validate manuscript semantics (no rendering)
	$(PY) $(SCRIPTS)/lint.py

book:                         ## render dist/software-engineering-handbook.{pdf,epub}
	$(PY) $(SCRIPTS)/build.py pdf

epub:                         ## render dist/software-engineering-handbook.epub only
	$(PY) $(SCRIPTS)/build.py epub

web:                          ## build the MkDocs site into dist/site/
	$(PY) $(SCRIPTS)/build.py web

serve: web                    ## build, then serve the web edition locally
	$(MKDOCS) serve -f web/mkdocs.yml

clean:                        ## remove all generated artifacts
	rm -rf generated/typst/* generated/web/* dist/*
