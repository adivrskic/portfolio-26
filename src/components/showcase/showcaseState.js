import { SHOWCASE_PROJECTS } from "./ShowcaseProjects";

/**
 * Tiny pub/sub for the showcase's current section — lets SectionProgress
 * (and anything else) react to scroll position without prop drilling.
 */
export const state = {
  _section: 0,
  _listeners: new Set(),
  get section() {
    return this._section;
  },
  set section(v) {
    if (v !== this._section) {
      this._section = v;
      this._listeners.forEach((fn) => fn(v));
    }
  },
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },
};

export const N = SHOWCASE_PROJECTS.length;
// hero + projects + outro
export const TOTAL_SECTIONS = N + 2;
