// 09-explain.js - explain("executionStats") on the vector query from 03.
// The docs list $vectorSearch execution statistics as "New in version 8.1", but
// on the Free cluster (8.0.34) the mongot stats are present: see NOTES.md and
// runs/2026-10-13/09-explain.txt.
db = db.getSiblingDB("sample_mflix");
load("vectors/time-travel.js"); // defines QUERY_EMBEDDING

const plan = db.embedded_movies.explain("executionStats").aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "plot_embedding_voyage_3_large",
      queryVector: QUERY_EMBEDDING,
      numCandidates: 150,
      limit: 10
    }
  }
]);

// The plan echoes the full 2048-float query vector under `command`; replace it
// with a marker so the output stays readable. printjson renders Long values
// as numbers (JSON.stringify would show them as {high, low}).
function trimVectors(o) {
  if (Array.isArray(o) && o.length === 2048) return "<2048 floats omitted>";
  if (o && typeof o === "object") for (const k of Object.keys(o)) o[k] = trimVectors(o[k]);
  return o;
}
printjson(trimVectors(plan));
