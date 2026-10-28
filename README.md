# OFF THE GROUND — Roadster Playground

A browser-based driving experiment with ramps, wall rides, cold-gas thrusters and an in-car camera. An independent creative concept, not affiliated with Tesla or SpaceX and not a representation of real vehicle performance.

**[Play the experience](https://rakipovich.me/roadster/)** · [More projects](https://rakipovich.me/)

## Source snapshot

Download and unpack `roadster-source-snapshot.zip`. The web source is in `roadster-portfolio-draft/web/`, built with Three.js, Rapier and Vite. It includes touch controls, a stunt park, scoring and a cabin camera.

This snapshot excludes the 3D scene and music pending redistribution review. It is not a complete playable clone: separately licensed assets must be supplied and configured to match the referenced paths.

## Development

After supplying the runtime assets under `web/public/`, with a compatible recent Node.js version:

```sh
cd roadster-portfolio-draft/web
npm ci
npm run dev
```

The snapshot has not yet been verified as a self-contained distribution. See `docs/assets-provenance.json` inside the archive for recorded sources and adaptations.

## Credits and reuse

Project-authored code is available under the [MIT license](LICENSE). The asphalt and night sky include adaptations from [RDSTR Stunts](https://github.com/sebayaki/roadster), copyright sebayaki.eth, under MIT; its notice is included in the archive. Third-party models and content have separate terms including CC BY and Adobe Mixamo terms. Check their original licenses before reuse. Tesla names and marks belong to their respective owner and are not licensed here.
