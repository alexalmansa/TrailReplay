# Shared landmark cache setup

The nearby named-places endpoint uses a Cloudflare Workers KV namespace named
`LANDMARK_CACHE` when it is available. It stores a bounded 0.25° geographic
tile for 30 days. KV expiration automatically removes unused data, so this
cache does not grow forever.

Create and bind the namespace once for both Production and Preview deployments:

```sh
npx wrangler kv namespace create LANDMARK_CACHE
```

Add the resulting namespace ID in the Cloudflare Pages project binding as
`LANDMARK_CACHE`, or add it to `wrangler.toml` as a `kv_namespaces` binding.
For local validation, start Pages with:

```sh
npx wrangler pages dev app/dist --kv LANDMARK_CACHE
```

## Coverage guarantee

The request expands the route by the existing nearby-place margin and converts
that full rectangle to cache tiles. A result is marked `coverage.complete` only
when every one of those tiles is stored. A cache miss fetches the whole missing
tile rectangle in one Overpass request, splits the response by tile, and marks
each resulting tile complete. The response exposes tile counts and cache hits;
the Route landmarks panel shows that coverage is complete.

Without the `LANDMARK_CACHE` binding, local development retains the prior
exact-route edge cache. This keeps the feature functional but does not share
coverage globally, so bind KV before production deployment.
