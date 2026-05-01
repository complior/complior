// V1-M30.8a+b: CI re-trigger marker (post-merge engine + Rust verification).
// Race condition cancelled the merge commit's CI runs on dev — same pattern
// as V1-M30.6 / V1-M30.7. paths-filter requires a touch in engine/core or cli/.
// V1-M30.7: CI re-trigger marker (post-merge engine + Rust verification).
// Race condition cancelled the merge commit's CI run on dev — same as V1-M30.6.
// This comment touches engine/core/ so paths-filter triggers Engine job.
// V1-M30.6: CI re-trigger marker (post-merge engine + Rust verification).
// Race condition cancelled the merge commit's CI run on dev; this comment
// touches engine/core/ so paths-filter triggers a full CI run.
export { loadApplication } from './composition-root.js';
