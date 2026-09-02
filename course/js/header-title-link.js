// Header link wiring for the Teach-with-MAGE site.
//
//  1. The hat logo and the "Teach with MAGE" title are BOTH home links (to this companion's /teach/ home).
//     The logo already links home by default; we wrap the title text in a home anchor too. CSS
//     (.md-header__brandlink) then extends that anchor's hit area left across the gap, so the whole
//     branding strip — hat, gap, and title — is one continuous click target with no visual change.
//  2. A distinct "MAGE homepage" link points OUT to the MAGE book/landing at the site root, so a reader can
//     leave the course companion for the main project. Named-distinct from "Teach with MAGE".
//
// Real anchors (not click handlers) keep this keyboard- and no-hack-friendly.
document.addEventListener("DOMContentLoaded", function () {
  // 1. Make the title text a home link (mirrors the logo's href).
  var logo = document.querySelector(".md-header__button.md-logo");
  var topic = document.querySelector(".md-header__title .md-header__topic > .md-ellipsis");
  if (logo && topic && !topic.closest("a")) {
    var brand = document.createElement("a");
    brand.href = logo.getAttribute("href");
    brand.className = "md-header__brandlink";
    brand.setAttribute("title", "Teach with MAGE");
    while (topic.firstChild) brand.appendChild(topic.firstChild);
    topic.appendChild(brand);
  }

  // 2. Inject a distinct "MAGE homepage" link out to the project root (the MAGE book/landing).
  var inner = document.querySelector(".md-header__inner");
  if (inner && !inner.querySelector(".md-header__mage-home")) {
    var home = document.createElement("a");
    home.className = "md-header__mage-home";
    home.href = "https://davisjam.github.io/model-based-agentic-software-engineering/";
    home.textContent = "MAGE homepage";
    home.setAttribute("title", "Go to the MAGE homepage");
    // Place it before the palette toggle (or the repo link) so it reads as a header nav item on the right.
    var anchorBefore = inner.querySelector("[data-md-component='palette']")
      || inner.querySelector(".md-header__source")
      || inner.querySelector("[data-md-component='option']");
    inner.insertBefore(home, anchorBefore || null);
  }
});
