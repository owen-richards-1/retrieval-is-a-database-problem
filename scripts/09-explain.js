// 09-explain.js - explain() on the vector query from 03.
// Docs: execution statistics for $vectorSearch are "New in version 8.1"
// (manual: explain-results). Free clusters run MongoDB 8.0, so the
// executionStats output may be missing or limited. Record what you see
// in NOTES.md.
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

print(JSON.stringify(plan, null, 2));
