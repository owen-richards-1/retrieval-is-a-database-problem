// 07-create-text-index.js - the second index: full-text (MongoDB Search).
// Together with vector_index this uses 2 of the 3 Free-tier index slots.
db = db.getSiblingDB("sample_mflix");
const coll = db.embedded_movies;

coll.createSearchIndex("default", "search", {
  mappings: { dynamic: true }
});
print("Index creation requested. Waiting for READY...");

// Poll until READY (docs: "a few minutes"; allow up to 5).
for (let i = 0; i < 60; i++) {
  const idx = coll.getSearchIndexes().find(x => x.name === "default");
  const status = idx ? idx.status : "not listed yet";
  print("[" + (i * 5) + "s] default status: " + status);
  if (status === "READY") break;
  sleep(5000);
}
