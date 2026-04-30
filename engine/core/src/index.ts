// V1-M30.6: CI re-trigger marker (post-merge engine + Rust verification).
// Race condition cancelled the merge commit's CI run on dev; this comment
// touches engine/core/ so paths-filter triggers a full CI run.
export { loadApplication } from './composition-root.js';
