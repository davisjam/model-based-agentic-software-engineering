#!/usr/bin/env bash
# Native TeX Live keeps Pandoc, rsvg, Python and TeX in the same CI environment.
# The historical repository is frozen; never mix it with the rolling CTAN tree.
set -euo pipefail
texlive_repository=https://ftp.math.utah.edu/pub/tex/historic/systems/texlive/2025/tlnet-final
texlive_root="${RUNNER_TEMP:?This installer is for GitHub Actions}/texlive-2025"
texlive_bin="$texlive_root/bin/x86_64-linux"
if [[ ! -x "$texlive_bin/lualatex" ]]; then
  texlive_install=$(mktemp -d)
  trap 'rm -rf "$texlive_install"' EXIT
  curl -fsSL --retry 5 --retry-delay 3 --retry-all-errors \
    "$texlive_repository/install-tl-unx.tar.gz" -o "$texlive_install/install.tar.gz"
  printf '%s  %s\n' '311df9f1477fd90c520159d1feddc2d6270f010d8349d1f6bdb9461a93b48a5c' \
    "$texlive_install/install.tar.gz" | sha256sum --check --strict
  tar -xzf "$texlive_install/install.tar.gz" -C "$texlive_install" --strip-components=1
  cat > "$texlive_install/profile" <<EOF
selected_scheme scheme-small
TEXDIR $texlive_root
TEXMFCONFIG $texlive_root/texmf-config
TEXMFVAR $texlive_root/texmf-var
TEXMFLOCAL $texlive_root/texmf-local
TEXMFSYSCONFIG $texlive_root/texmf-config
TEXMFSYSVAR $texlive_root/texmf-var
binary_x86_64-linux 1
instopt_adjustpath 0
tlpdbopt_install_docfiles 0
tlpdbopt_install_srcfiles 0
EOF
  perl "$texlive_install/install-tl" -profile "$texlive_install/profile" -repository "$texlive_repository"
  "$texlive_bin/tlmgr" install --repository "$texlive_repository" \
    collection-latexextra collection-luatex collection-fontsrecommended collection-bibtexextra pgfplots preview
fi
printf '%s\n' "$texlive_bin" >> "${GITHUB_PATH:?}"
"$texlive_bin/lualatex" --version
"$texlive_bin/bibtex" --version
