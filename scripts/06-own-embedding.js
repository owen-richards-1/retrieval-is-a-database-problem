// 06-own-embedding.js - use a stored movie's own embedding as the query.
// UNVERIFIED-by-docs: the docs say queryVector accepts BinData of the right
// subtype, and the sample data stores embeddings as binData, but no docs
// page runs this exact recipe. TEST IT before relying on it.
db = db.getSiblingDB("sample_mflix");
const TITLE = "Dune"; // change me
const FIELD = "plot_embedding_voyage_3_large";

const src = db.embedded_movies.findOne({ title: TITLE }, { title: 1, [FIELD]: 1 });
if (src === null) {
  print('Skipped: no movie titled "' + TITLE + '" in embedded_movies. Change TITLE.');
} else {
  // Fallback if the server rejects the BinData value (also UNVERIFIED):
  //   const queryVector = Array.from(src[FIELD].toFloat32Array());
  const queryVector = src[FIELD];

  // Ask for 11: the source movie is its own top hit, so we drop it below.
  const results = db.embedded_movies.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: FIELD,
        queryVector: queryVector,
        numCandidates: 150,
        limit: 11
      }
    },
    { $project: { title: 1, year: 1, score: { $meta: "vectorSearchScore" } } }
  ]).toArray().filter(r => !r._id.equals(src._id));

  print('Movies nearest to "' + TITLE + '" (by plot embedding):');
  print("TITLE".padEnd(40) + "YEAR".padEnd(8) + "SCORE");
  results.slice(0, 10).forEach(r =>
    print(String(r.title).slice(0, 38).padEnd(40) + String(r.year).padEnd(8) + r.score)
  );
}
