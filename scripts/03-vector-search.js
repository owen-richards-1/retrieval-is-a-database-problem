// 03-vector-search.js - approximate nearest neighbour (ANN) search.
// QUERY_EMBEDDING is the 2048-float "time travel" vector (see vectors/README.md).
// Docs' expected top hit: "About Time", score 0.7710...
db = db.getSiblingDB("sample_mflix");
load("vectors/time-travel.js"); // defines QUERY_EMBEDDING

const results = db.embedded_movies.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "plot_embedding_voyage_3_large",
      queryVector: QUERY_EMBEDDING,
      numCandidates: 150, // how many candidates the ANN graph search considers
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

// Print a simple table: title, year, score.
print("TITLE".padEnd(40) + "YEAR".padEnd(8) + "SCORE");
results.forEach(r =>
  print(String(r.title).slice(0, 38).padEnd(40) + String(r.year).padEnd(8) + r.score)
);
