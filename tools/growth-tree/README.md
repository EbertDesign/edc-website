# Growth tree

Bakes `public/images/growth-tree.webp`, the growth map the homepage's
Approach section reveals through `src/components/Media/GrowthTree.astro`.

```
node tools/growth-tree/build.mjs
```

Tune the composite and the growth in `CONFIG` at the top of `build.mjs`,
run it again, and reload.

## Sources

Both are public domain (CC0 1.0), published by OpenClipart and downloaded
from freesvg.org on 2026-11-26. No attribution is required.

| File | Used for | Source |
|---|---|---|
| `crown.svg` | trunk and crown | [Tree Silhouette Isolated on White Background](https://freesvg.org/tree-silhouette-isolated-on-white-background), SVG ID 192944 |
| `roots.svg` | roots (the tree above them is dropped) | [Tree with Deep Roots Silhouette](https://freesvg.org/tree-with-deep-roots-silhouette), SVG ID 133500 |
