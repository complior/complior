// V1-M30.7: CI re-trigger marker (post-merge engine + Rust verification).
// Race condition cancelled the merge commit's CI run on dev — same as V1-M30.6.
// This comment touches engine/core/ so paths-filter triggers Engine job.
// V1-M30.6: CI re-trigger marker (post-merge engine + Rust verification).
// Race condition cancelled the merge commit's CI run on dev; this comment
// touches engine/core/ so paths-filter triggers a full CI run.
export { loadApplication } from './composition-root.js';
