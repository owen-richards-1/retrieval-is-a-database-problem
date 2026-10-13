// 01-inspect.js - look at the collection before indexing anything.
// `use` is not valid in --file scripts, so we pick the database explicitly.
db = db.getSiblingDB("sample_mflix");
const coll = db.embedded_movies;
const FIELD = "plot_embedding_voyage_3_large";

// Safe helper: report the dimensions of a vector field whatever its type is.
function dimsOf(v) {
  try {
    if (Array.isArray(v)) return v.length;
    // Stored as BSON binData (vector subtype): try the Binary helpers.
    if (v && typeof v.toFloat32Array === "function") return v.toFloat32Array().length;
  } catch (e) { /* fall through */ }
  return "unknown (could not read dims)";
}

print("documents: " + coll.countDocuments({}));
print("indexes (regular, not search): " + coll.getIndexes().map(i => i.name).join(", "));

const doc = coll.findOne({}, { title: 1, year: 1, genres: 1, directors: 1, [FIELD]: 1 });
print("\n-- one document --");
print("title:     " + doc.title);
print("year:      " + doc.year);
print("genres:    " + JSON.stringify(doc.genres));
print("directors: " + JSON.stringify(doc.directors));

const v = doc[FIELD];
print("\n-- " + FIELD + " --");
print("typeof:              " + typeof v);
print("Array.isArray:       " + Array.isArray(v));
print("instanceof Binary:   " + (typeof Binary !== "undefined" && v instanceof Binary));
print("dims:                " + dimsOf(v));

print("\n-- David Lynch --");
const lynch = coll.findOne({ directors: "David Lynch" }, { title: 1 });
if (lynch === null) {
  print("No David Lynch films in this collection (it holds Western/Action/Fantasy).");
} else {
  coll.find({ directors: "David Lynch" }, { title: 1, year: 1 })
      .forEach(m => print(m.title + " (" + m.year + ")"));
}
