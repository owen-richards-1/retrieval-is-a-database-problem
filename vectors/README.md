# vectors/

`time-travel.js` holds the 2048-float embedding of the string "time travel"
(for the `plot_embedding_voyage_3_large` field). It is copied from the Atlas
Vector Search quick start, so no embedding API key is needed:
https://www.mongodb.com/docs/vector-search/tutorials/quick-start

It defines one global, `QUERY_EMBEDDING`, which the scripts read with
`load("vectors/time-travel.js")`. Check it with `QUERY_EMBEDDING.length`
(should be 2048).

Other vectors: the docs print literal query vectors on the quick start, the
`$vectorSearch` stage page ("kids adventure", "world war") and the hybrid
search tutorial. Note the hybrid one is for a different field
(`plot_embedding_voyage_4_large`), so do not use it with this lab's index.
Save your own as `*.local.js` (git-ignored).
