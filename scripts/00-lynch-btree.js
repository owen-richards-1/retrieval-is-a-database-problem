// 00-lynch-btree.js - Part 1 of the talk: the index you already know.
// One lookup, find({ directors: "David Lynch" }), explained twice: without an
// index (a collection scan) and with a B-tree index on `directors`. The index
// is dropped at the end so the collection is back to `_id` only for script 01.
db = db.getSiblingDB("sample_mflix");
const coll = db.embedded_movies;
const query = { directors: "David Lynch" };

function summarise(label) {
  const ex = coll.find(query).explain("executionStats");
  const s = ex.executionStats;
  let stage = ex.queryPlanner.winningPlan;
  const stages = [];
  while (stage) { stages.push(stage.stage); stage = stage.inputStage; }
  print("\n== " + label + " ==");
  print("winning plan:        " + stages.join(" -> "));
  print("documents returned:  " + s.nReturned);
  print("index keys examined: " + s.totalKeysExamined);
  print("documents examined:  " + s.totalDocsExamined);
  print("execution time (ms): " + s.executionTimeMillis);
}

print("films by David Lynch in this collection: " +
  coll.find(query, { title: 1, year: 1 }).toArray().map(m => m.title + " (" + m.year + ")").join(", "));

summarise("without an index: COLLSCAN");

coll.createIndex({ directors: 1 });
print("\ncreated index { directors: 1 } (a B-tree; `directors` is an array, so it is a multikey index)");

summarise("with the index: IXSCAN");

coll.dropIndex({ directors: 1 });

// Part 2: a compound index in Equality, Sort, Range order (ESR).
// Query: Lynch films under 140 minutes, oldest first (Dune runs 137). With the index
// { directors: 1, year: 1, runtime: 1 } the plan needs no SORT stage: the
// index already hands documents back in year order.
function summariseSorted(label) {
  const ex = coll.find({ directors: "David Lynch", runtime: { $lt: 140 } }).sort({ year: 1 }).explain("executionStats");
  const s = ex.executionStats;
  let stage = ex.queryPlanner.winningPlan;
  const stages = [];
  while (stage) { stages.push(stage.stage); stage = stage.inputStage || (stage.inputStages && stage.inputStages[0]); }
  print("\n== " + label + " ==");
  print("winning plan:        " + stages.join(" -> "));
  print("in-memory SORT:      " + (stages.includes("SORT") ? "yes" : "no"));
  print("documents returned:  " + s.nReturned);
  print("index keys examined: " + s.totalKeysExamined);
  print("documents examined:  " + s.totalDocsExamined);
  if (label.includes("ESR")) {
    const ix = ex.queryPlanner.winningPlan.inputStage;
    print("explain, trimmed (the deck's slide 8):");
    printjson({ winningPlan: { stage: ex.queryPlanner.winningPlan.stage, inputStage: { stage: ix.stage, indexName: ix.indexName, keyPattern: ix.keyPattern } },
      executionStats: { nReturned: s.nReturned, totalKeysExamined: s.totalKeysExamined, totalDocsExamined: s.totalDocsExamined, executionTimeMillis: s.executionTimeMillis } });
  }
}
summariseSorted("sorted query, no index: COLLSCAN + SORT");
coll.createIndex({ directors: 1, year: 1, runtime: 1 });
summariseSorted("sorted query with the ESR index { directors: 1, year: 1, runtime: 1 }");
coll.dropIndex({ directors: 1, year: 1, runtime: 1 });

print("\ndropped the indexes again; regular indexes now: " + coll.getIndexes().map(i => i.name).join(", "));
