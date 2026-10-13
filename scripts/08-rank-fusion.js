// 08-rank-fusion.js - hybrid search: vector + full-text, merged by $rankFusion.
// $rankFusion needs MongoDB 8.0+ (Free runs 8.0). Each pipeline ranks its
// own results; the fused score is the sum of 1/(60 + rank) per pipeline
// (formula from the $rankFusion reference page), scaled by the weights.
db = db.getSiblingDB("sample_mflix");
load("vectors/time-travel.js"); // defines QUERY_EMBEDDING

const results = db.embedded_movies.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          semantic: [
            {
              $vectorSearch: {
                index: "vector_index",
                path: "plot_embedding_voyage_3_large",
                queryVector: QUERY_EMBEDDING,
                numCandidates: 500,
                limit: 20
              }
            }
          ],
          lexical: [
            {
              $search: {
                index: "default",
                text: { query: "time travel", path: ["title", "plot"] }
              }
            },
            { $limit: 20 }
          ]
        }
      },
      combination: { weights: { semantic: 0.5, lexical: 0.5 } },
      scoreDetails: true
    }
  },
  { $project: { _id: 0, title: 1, year: 1, scoreDetails: { $meta: "scoreDetails" } } },
  { $limit: 10 }
]).toArray();

print("TITLE".padEnd(40) + "YEAR".padEnd(8) + "RRF SCORE");
results.forEach(r =>
  print(String(r.title).slice(0, 38).padEnd(40) + String(r.year).padEnd(8) + r.scoreDetails.value)
);
