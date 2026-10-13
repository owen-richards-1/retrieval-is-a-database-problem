# retrieval-is-a-database-problem

A small hands-on lab for the talk "Retrieval is a database problem: indexing for
an AI application, from B-trees to vectors". You build a vector index and a
text index on the `sample_mflix.embedded_movies` sample data on an Atlas Free
cluster, then run nine short `mongosh` scripts: ANN vs exact search, filtered
search, hybrid search with `$rankFusion`, and `explain()`. No embedding API key
is needed.

## What you need

- A MongoDB Atlas account and a Free cluster
- `mongosh` (`brew install mongosh`)
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
   `.env`. `.env` is git-ignored.
5. **The query vector is included.** `vectors/time-travel.js` defines
   `QUERY_EMBEDDING`, the 2048-float "time travel" embedding from the Vector
   Search quick start, so no embedding API key is needed. See `vectors/README.md`.

## Run the lab

Run each with `./run.sh scripts/NAME.js`.

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
6. `06-own-embedding.js` - use a stored movie's embedding as the query. Untested, see
   "Check first".
7. `07-create-text-index.js` - creates the `default` full-text index.
8. `08-rank-fusion.js` - hybrid search: two indexes, one query, merged by
   reciprocal rank fusion.
9. `09-explain.js` - `explain("executionStats")` on the vector query.

Write down what you saw in `NOTES.md`.

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

## Check first

These are marked unverified in my notes; test before you rely on them.

- **Own-embedding recipe (script 06).** The docs allow BinData as `queryVector`,
  but I found no example that does this exact `findOne` then `$vectorSearch`.
  The `toFloat32Array()` fallback is also unverified.
- **explain on 8.0 (script 09).** Execution stats for `$vectorSearch` are "New in
  version 8.1"; Free runs 8.0, so output may be limited.
- **`exact: true` with `numCandidates`.** The docs only say `numCandidates` is
  required for ANN, so script 04 omits it. Whether supplying both errors is
  unstated.
- **Field name.** The reference page lists `plot_embedding_voyage_3_large`; the
  hybrid tutorials use `plot_embedding_voyage_4_large`. Run
  `db.embedded_movies.findOne({}, {plot_embedding_voyage_3_large: 1})` to
  confirm the field is present on your cluster.

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
