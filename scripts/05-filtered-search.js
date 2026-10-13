// 05-filtered-search.js - pre-filtering inside the vector index.
// `year` and `genres` were indexed as filter fields in 02, so the filter
// runs as part of the search, not after it. Docs note: filtered queries
// are typically slower than an equivalent unfiltered one.
db = db.getSiblingDB("sample_mflix");
load("vectors/time-travel.js"); // defines QUERY_EMBEDDING

function run(label, filter) {
  const results = db.embedded_movies.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "plot_embedding_voyage_3_large",
        queryVector: QUERY_EMBEDDING,
        filter: filter,
        numCandidates: 150,
        limit: 10
      }
    },
    {
      $project: {
        _id: 0, title: 1, year: 1, genres: 1,
        score: { $meta: "vectorSearchScore" }
      }
    }
  ]).toArray();

  print("\n== " + label + " ==");
  print("TITLE".padEnd(40) + "YEAR".padEnd(8) + "SCORE");
  results.forEach(r =>
    print(String(r.title).slice(0, 38).padEnd(40) + String(r.year).padEnd(8) + r.score)
  );
}

run("Variant 1: year >= 1990", { year: { $gte: 1990 } });
run("Variant 2: genres = Fantasy", { genres: "Fantasy" });
