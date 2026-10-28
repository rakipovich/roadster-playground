# OFF THE GROUND — Roadster Playground

A browser-based driving experiment with ramps, wall rides, cold-gas thrusters and an in-car camera. Built as an independent creative concept; it is not affiliated with Tesla or SpaceX and does not represent real vehicle performance.

**[Play the experience](https://rakipovich.me/roadster/)** · [More projects](https://rakipovich.me/)

## What is here

The web application source is in `web/`. It uses Three.js, Rapier and Vite, and includes touch controls, a free-roam stunt park, scoring and a cabin camera. The public demo contains the complete authored experience; this source snapshot deliberately excludes the bundled 3D scene and music pending a redistribution review. Consequently it is not yet a complete playable clone: models and other runtime assets must be supplied separately and configured to match the paths referenced in the source.

## Development

With the separately licensed runtime assets placed under `web/public/` and a recent Node.js version compatible with the dependencies:

```sh
cd web
npm ci
npm run dev
```

`npm run build` also invokes `scripts/package-ride.mjs`, which requires the runtime assets. See `docs/assets-provenance.json` for the recorded sources and adaptations. This draft has not yet been tested as a self-contained distribution.

## Credits and reuse

The asphalt and night sky include adaptations from [RDSTR Stunts](https://github.com/sebayaki/roadster), copyright sebayaki.eth, under the MIT license reproduced in `docs/rdstr-MIT.txt`. Other third-party models and content have separate terms, including CC BY and Adobe Mixamo terms; consult the source manifest and original licenses before reuse. The Tesla name and marks belong to their respective owner and are not licensed by this project. Promotional images and audio are not part of this source snapshot.

The licensing of project-authored code and the distribution of bundled assets must be finalized before publishing this draft as a reusable repository.
