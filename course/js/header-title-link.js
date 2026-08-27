// The header logo/icon links to the home page by default; extend that to the
// "Teach with MAGE" title text so the whole branding area is one home link.
// A real anchor (not a click handler) keeps it keyboard- and no-hack-friendly.
document.addEventListener("DOMContentLoaded", function () {
  var logo = document.querySelector(".md-header__button.md-logo");
  var topic = document.querySelector(".md-header__title .md-header__topic > .md-ellipsis");
  if (!logo || !topic || topic.closest("a")) return;
  var a = document.createElement("a");
  a.href = logo.getAttribute("href");
  a.setAttribute("title", "Teach with MAGE");
  a.style.color = "inherit";
  a.style.textDecoration = "none";
  while (topic.firstChild) a.appendChild(topic.firstChild);
  topic.appendChild(a);
});
