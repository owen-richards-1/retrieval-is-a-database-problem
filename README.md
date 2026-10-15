# retrieval-is-a-database-problem

A small hands-on lab for the talk "Retrieval is a database problem: indexing for
an AI application, from B-trees to vectors" (Owen Richards, 15 Oct 2026). The
talk's point: finding the right data for an AI application is an indexing
problem, and MongoDB already has the tools. You build a vector index and a
text index on the `sample_mflix.embedded_movies` sample data (3,483 films) on an
Atlas Free cluster, then run ten short `mongosh` scripts: a B-tree before/after,
ANN vs exact search, filtered search, hybrid search with `$rankFusion`, and
`explain()`. No embedding API key is needed. Recorded output of every script is
in `runs/`, so you can read the results without running anything.

## What you need

- A MongoDB Atlas account and a Free cluster
- `mongosh` (`brew install mongosh`). That is the only runtime: the scripts are
  mongosh scripts, so no Node.js install or `npm install` is needed.
- A Unix shell (macOS or Linux) for `run.sh`
- Optional: the Atlas CLI (`brew install mongodb-atlas-cli`)

## Setup

1. **Create a Free cluster.** Free clusters were formerly called M0; the Atlas UI
   says "Free". "You can deploy only one Free cluster per Atlas project."
   Free clusters run MongoDB 8.0 and the version can't be changed. Deploy guide:
   https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster
2. **Load the sample data.** In Atlas: "go to the Clusters page for your
   project", click the Ellipses (...) button for your cluster, click "Load Sample
   Dataset", choose datasets, click "Load sample data". You need `Project Owner`
   access. Or with the CLI: `atlas clusters sampleData load <clusterName>`.
   It can take several minutes. Load **only `sample_mflix`** (the dialog lets you
   pick); all datasets together may crowd the 0.5 GB limit.
   Gotcha: "If any of these namespaces already exist on your cluster when you
   attempt to load the sample data, the operation will fail and no sample data
   will be loaded." If `sample_mflix` exists without `embedded_movies`, drop the
   `sample_mflix` database and reload.
3. **Connect.** In Atlas go to Connect -> Shell, copy the `mongosh` command and
   connection string from the modal (the shell prompts for the password). You
   also need a database user and an IP access-list entry.
   https://www.mongodb.com/docs/atlas/mongo-shell-connection
4. **Configure.** `cp .env.example .env`, then put your connection string in
   `.env` (one line: `MONGODB_URI="mongodb+srv://..."`). `.env` is git-ignored.
   `run.sh` reads it and starts `mongosh` for you.
5. **The query vector is included.** `vectors/time-travel.js` defines
   `QUERY_EMBEDDING`, the 2048-float "time travel" embedding from the Vector
   Search quick start, so no embedding API key is needed. See `vectors/README.md`.

## Run the lab

Run each with `./run.sh scripts/NAME.js`, in order, from the repo root. Only
scripts 02 and 07 create anything on the cluster that stays: `vector_index`
(vector, on `plot_embedding_voyage_3_large`: 2048 dimensions, `dotProduct`,
with `year` and `genres` as filter fields) and `default` (full-text). Script 00
creates regular indexes but drops them again. Scripts 03, 04, 05, 06, 08 and 09
need the vector index; 08 also needs the text index, so run 02 and 07 first.

0. `00-lynch-btree.js` - the index you already know: `find({ directors: "David Lynch" })`
   explained without an index (COLLSCAN, 3,483 documents examined) and with a
   B-tree on `directors` (one key, one document); then the same with a sort and
   an Equality-Sort-Range compound index (no SORT stage). Drops its indexes after.
1. `01-inspect.js` - count, one document, the vector field's type and dimensions.
   Notice: no index but `_id` (so anything else is a collection scan), and the
   vectors are stored as binary data.
2. `02-create-vector-index.js` - creates `vector_index` and waits for READY.
   Notice: vector and filter fields live in one index.
3. `03-vector-search.js` - ANN `$vectorSearch`. Notice the top hit and scores
   (the docs show "About Time", 0.7710...).
4. `04-exact-search.js` - the same query with `exact: true`. Compare with 03:
   same ranking? same scores?
5. `05-filtered-search.js` - filter by `year` and by `genres`. Notice the filter is
   applied inside the index search, not after it.
6. `06-own-embedding.js` - use a stored movie's embedding as the query. Which
   films sit nearest to Dune (1984)?
7. `07-create-text-index.js` - creates the `default` full-text index.
8. `08-rank-fusion.js` - hybrid search: two indexes, one query, merged by
   reciprocal rank fusion.
9. `09-explain.js` - `explain("executionStats")` on the vector query.

Write down what you saw in `NOTES.md`.

### Script to slide

| Script | What the slide quotes |
|---|---|
| 00 | Lynch lookup: COLLSCAN examines 3,483 docs; with `directors_1`, 1 key and 1 doc. ESR query (`directors` "David Lynch", `runtime` < 140, sort `year`), index `{directors:1, year:1, runtime:1}`: Dune (1984, 137 min), 2 keys, 1 doc, no SORT stage |
| 03 | `$vectorSearch`, `numCandidates` 150, `limit` 10; top hit About Time |
| 04 | Exact search; agrees with 03 on 9 of the top 10 |
| 05 | Same query, filtered to `year >= 1990` (a declared filter field) |
| 08 | `$rankFusion` with pipelines `semantic` (`numCandidates` 500, `limit` 20) and `lexical` (`$search` on title and plot, `$limit` 20), weights 0.5 / 0.5, final `$limit` 10; About Time fused score 0.01626 |
| 04 (error) | `exact: true` with `numCandidates` is rejected: `"numCandidates" must be omitted when "exact" is set to true` (noted in `NOTES.md`; script 04 omits it) |

Scripts 01, 02, 06, 07 and 09 are setup or extras and are not quoted directly.

## Free-tier limits that shape this lab

- 3 search/vector indexes in total, any type, and 3 KB per definition. This lab
  uses 2. https://www.mongodb.com/docs/search/deployment/feature-compatibility
- 0.5 GB storage, including indexes.
  https://www.mongodb.com/docs/atlas/reference/free-shared-limitations
- MongoDB 8.0, so `$rankFusion` works but `$scoreFusion` and `$rerank` (which
  need 8.3+) are not used. This is inferred from the version requirement; no
  Free-tier page says it outright.
  https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search-overview
- 100 operations per second.
  https://www.mongodb.com/docs/atlas/reference/free-shared-limitations

## Checked on 13 Oct 2026

Four things the docs leave open, tested on a Free cluster running 8.0.34
(details and numbers in `NOTES.md`, raw output in `runs/2026-10-13/`):

- **Own-embedding recipe (script 06):** works. A stored `BinData` vector is
  accepted as `queryVector` with no conversion.
- **explain on 8.0 (script 09):** `executionStats` does include the mongot
  stats for `$vectorSearch` on 8.0.34.
- **`exact: true` with `numCandidates`:** the server rejects it
  (`"numCandidates" must be omitted when "exact" is set to true`), so script 04
  omits it.
- **Field name:** the loaded sample data has `plot_embedding_voyage_3_large`,
  `plot_embedding_voyage_4_large` and `plot_embedding`. The lab uses the first.

## Runs

`runs/<date>/` holds the output of each script from a real run, so the
numbers in `NOTES.md` can be checked. `runs/2026-10-13/` is the full run;
`runs/2026-10-14/` re-runs script 00 after its sorted query was widened to
`runtime < 140` (the 13 Oct version returned no rows).

## Talk

Companion to a talk given 15 Oct 2026; slides are not in this repo.

## Licence

MIT, see `LICENSE`.

## Sources

- Free cluster limitations: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations
- Deploy a Free cluster: https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster
- Load sample data: https://www.mongodb.com/docs/atlas/import/load-sample-data
- Sample datasets: https://www.mongodb.com/docs/manual/sample-data
- sample_mflix: https://www.mongodb.com/docs/manual/sample-data/sample-mflix
- Search feature compatibility: https://www.mongodb.com/docs/search/deployment/feature-compatibility
- Vector Search quick start: https://www.mongodb.com/docs/vector-search/tutorials/quick-start
- Vector index types: https://www.mongodb.com/docs/vector-search/indexes/vector-search-type
- $vectorSearch stage: https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage
- Hybrid search overview: https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search-overview
- Hybrid vector and full-text search: https://www.mongodb.com/docs/vector-search/hybrid-search/vector-search-with-full-text-search
- $rankFusion: https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankFusion
- Connect with mongosh: https://www.mongodb.com/docs/atlas/mongo-shell-connection
- Vector Search explain: https://www.mongodb.com/docs/vector-search/query/explain
- Explain results: https://www.mongodb.com/docs/manual/reference/explain-results
