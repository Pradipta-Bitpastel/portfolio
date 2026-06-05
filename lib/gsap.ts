/**
 * Central GSAP plugin registrar.
 *
 * As of GSAP 3.13+ every plugin (SplitText, DrawSVG, ScrollTrigger,
 * etc.) ships free in the public package, so there is no longer any
 * "Club license might be missing" path to guard against — we static
 * import the exact set the site uses and register them once.
 *
 *   - ScrollTrigger  (scroll-driven reveals + the global scene driver)
 *   - SplitText      (headline / section-title per-char reveals)
 *   - DrawSVGPlugin  (timeline + grid stroke reveals)
 *   - TextPlugin     (boot-log typewriter)
 *   - CustomEase     (named easing curves)
 *
 * `registerAll()` is async only so existing `await registerAll()`
 * call-sites keep working; the work itself is synchronous + idempotent.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { TextPlugin } from "gsap/TextPlugin";
import { CustomEase } from "gsap/CustomEase";

let registered = false;

export async function registerAll(): Promise<void> {
  if (typeof window === "undefined" || registered) return;
  registered = true;

  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, TextPlugin, CustomEase);

  // Named easing curves used across sections.
  CustomEase.create("powerSmooth", "M0,0 C0.2,0 0.1,1 1,1");
  CustomEase.create("signalSnap", "M0,0 C0.4,0 0.2,1 1,1");

  // A slightly looser default for scroll-scrubbed DOM tweens.
  gsap.defaults({ ease: "power2.out" });
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, TextPlugin, CustomEase };

const gsapModule = { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, registerAll };
export default gsapModule;
