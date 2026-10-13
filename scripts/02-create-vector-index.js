// 02-create-vector-index.js - build the one vector index the lab uses.
// Index definition follows the Atlas quick start (2048 dims, dotProduct,
// scalar quantization), plus two `filter` fields.
//
// Why filter fields now: a Free cluster allows 3 search/vector indexes in
// TOTAL (the lab needs 2). Putting `year` and `genres` in this one index
// means the filtered step (05) needs no index edit and no extra slot.
db = db.getSiblingDB("sample_mflix");
const coll = db.embedded_movies;

coll.createSearchIndex("vector_index", "vectorSearch", {
  fields: [
    {
      type: "vector",
      path: "plot_embedding_voyage_3_large",
      numDimensions: 2048,
      similarity: "dotProduct",
      quantization: "scalar"
    },
    { type: "filter", path: "year" },
    { type: "filter", path: "genres" }
  ]
});
print("Index creation requested. Waiting for READY...");

// Poll until the index is READY (docs: about one minute; allow longer).
for (let i = 0; i < 60; i++) {
  const idx = coll.getSearchIndexes().find(x => x.name === "vector_index");
  const status = idx ? idx.status : "not listed yet";
  print("[" + (i * 5) + "s] vector_index status: " + status);
  if (status === "READY") break;
  sleep(5000);
}
