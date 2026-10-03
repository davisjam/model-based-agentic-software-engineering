/**
 * The `statusbar` region: quiet when the model is valid, specific when it is not.
 *
 * Correction 9's first half. "Validation — No validation findings." was a page-long section
 * announcing a non-event; the status bar reduces it to a word and keeps the detail where it already
 * was. Wave 0 builds the chip and the region; the findings PANEL that opens from activating the
 * chip is a later wave's, so the finding list is still rendered below rather than behind a control.
 * That is the §3.1 rule honoured rather than dodged: no semantic content is hidden here, because
 * nothing here is behind anything.
 *
 * **The chip is a readout, not a button.** Making it activatable now would add a human affordance
 * the capability registry does not declare, which the browser tier reads as an unregistered control
 * — correctly, since the capability it would serve (`validate`) already names the finding list. The
 * word comes from the same `findings` array the list renders, so the chip cannot say Valid over a
 * list of problems.
 */
import { byId, mountIf } from "./context.ts";
import type { ShellContext, ShellFrame, ShellRegion } from "./context.ts";
import { regionHost } from "./surfaces.ts";

export function mountStatus(_ctx: ShellContext): ShellRegion {
  const region = regionHost("statusbar");
  const chip = byId("status-chip");

  return {
    paint: (frame: ShellFrame) => {
      mountIf(region, frame.state.loaded);
      const n = frame.state.findings.length;
      // A WORD, never a glyph or a colour alone — the house rule for every status in this page.
      chip.textContent = n === 0
        ? "Valid — no validation findings"
        : `${n} validation finding${n === 1 ? "" : "s"}`;
    },
  };
}
