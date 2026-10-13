# What I saw

Run on 13 Oct 2026 on an Atlas Free cluster (`retrieval`, AWS eu-west-1,
MongoDB 8.0.34, mongot 1.76.1) against `sample_mflix.embedded_movies`:
3483 documents, 279 MB of sample data in total on a 512 MB cluster. Both
indexes reached READY in under a minute. Raw output of every script is in
`runs/2026-10-13/`.

## Observations

1. **ANN and exact search agree on 9 of the top 10, but not on the scores.**
   For "time travel", ANN gives About Time 0.77053; exact gives 0.77101, which
   is the number the docs print. Ranks 3 and 4 swap (Timecop, A.P.E.X.) and
   rank 10 differs. The gap is quantization: `explain` shows the index field as
   `knnF32Q7`, so the approximate search runs on 7-bit scalar-quantized
   vectors while exact search reads the full-fidelity ones.
2. **The filter runs inside the index, not after it.** `year >= 1990` still
   returns ten films, in the same score order, with the pre-1990 ones replaced
   rather than removed. The Fantasy filter also surfaced the same film twice
   (Kate & Leopold, two documents): sample data is not clean data.
3. **Rank fusion's arithmetic is visible in the output.** About Time's fused
   score, 0.016261, is exactly 0.5/61 + 0.5/62: rank 1 in the vector list, rank 2
   in the text list. A film found by only one pipeline can score at most
   0.5/61 = 0.0082, which is why the fused list splits into "found by both"
   (above 0.015) and "found by one" (below 0.009).

One more count, run the same day in mongosh: only 4 of the 3,483 documents
contain the literal phrase "time travel" in `plot` or `title`
(`countDocuments({ $or: [ { plot: /time travel/i }, { title: /time travel/i } ] })`),
which is why the lexical list for that query is short and odd while the
vector list is long.

A side note for the talk: the one David Lynch film in this collection is
Dune (1984). Its nearest neighbours by plot are The Scorpion King, Metalstorm,
Krull, Starcrash and three Star Wars films.

## The B-tree, for comparison (script 00)

| Query | Plan | Keys examined | Docs examined |
|------|------|---------------|---------------|
| `find({ directors: "David Lynch" })`, no index | COLLSCAN | 0 | 3483 |
| same, with `{ directors: 1 }` | FETCH -> IXSCAN | 1 | 1 |
| same + `runtime < 130`, sorted by year, no index | SORT -> COLLSCAN | 0 | 3483 |
| same, with `{ directors: 1, year: 1, runtime: 1 }` | FETCH -> IXSCAN, no SORT | 2 | 0 |

The last row returns nothing (Dune runs 137 minutes), which is the point: the
index alone answered it without touching a document.

## Results

| Step | Rank 1 (score) | Rank 2 (score) | Rank 3 (score) |
|------|----------------|----------------|----------------|
| ANN (03) | About Time (0.77053) | Retroactive (0.75968) | Timecop (0.75767) |
| ENN (04) | About Time (0.77101) | Retroactive (0.76005) | A.P.E.X. (0.75769) |
| Filtered (05, year >= 1990) | About Time (0.77053) | Retroactive (0.75968) | Timecop (0.75767) |
| Filtered (05, genres = Fantasy) | About Time (0.77053) | The Time Traveler's Wife (0.74932) | Kate & Leopold (0.74476) |
| Own embedding (06, Dune) | The Scorpion King (0.93716) | Metalstorm (0.91498) | Krull (0.91458) |
| $rankFusion (08) | About Time (0.016261) | Timecop (0.015629) | The Time Traveler's Wife (0.015443) |

Explain (09): did `executionStats` show `$vectorSearch` stats on 8.0? **Yes**,
on 8.0.34: the mongot section reports the Lucene query (k = 150), per-phase
timings, 4 segments over 3483 docs, and an estimated 71 ms for the stage on
the first run (15 ms on a repeat).
`nReturned` reads 0 for the search stages and the query vector is printed as
"redacted".

## Check-first items, now checked

- **Own-embedding recipe:** works. A stored `BinData` vector goes straight into
  `queryVector`; no conversion needed. The source film is its own top hit, as
  expected, and is dropped from the printed list.
- **`exact: true` with `numCandidates`:** rejected by the server:
  `"numCandidates" must be omitted when "exact" is set to true`.
- **explain on 8.0:** stats present (above).
- **Field names:** all three embedding fields are on the loaded data:
  `plot_embedding_voyage_3_large`, `plot_embedding_voyage_4_large` and
  `plot_embedding`.
