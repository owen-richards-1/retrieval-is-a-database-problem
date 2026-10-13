// 04-exact-search.js - exact nearest neighbour (ENN): same query as 03,
// but exact: true and no numCandidates (the documented ENN form).
// Compare this table with 03's. Note: with quantization on, the docs say
// ENN uses only the full-fidelity vectors, so scores may differ slightly.
db = db.getSiblingDB("sample_mflix");
load("vectors/time-travel.js"); // defines QUERY_EMBEDDING

const results = db.embedded_movies.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "plot_embedding_voyage_3_large",
      queryVector: QUERY_EMBEDDING,
      exact: true,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0, title: 1, plot: 1, year: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
]).toArray();

print("TITLE".padEnd(40) + "YEAR".padEnd(8) + "SCORE");
results.forEach(r =>
  print(String(r.title).slice(0, 38).padEnd(40) + String(r.year).padEnd(8) + r.score)
);
