# The animated keynote (renderer `itw-keynote-v2`)

`../index.html` is generated: the keynote deck (`/index.html`) with the film drawn over its stage from station 3 on.
Rebuild after any change to the deck or the film: `python3 build_v2.py`.

- `data.js` — drawings and hand-drawn helpers taken from the deck (figure, room, rig, arteries, icons, the car, the mark).
- `lib.js` — the film's engine (polylines drawn on, words timed to the narration, camera, the vessel tunnel).
- `scenes.js` — the scenes, each tied to the narration's word times in `timeline.json`.
- `glue.js` — the film inside the deck: station → pause point (`HOLD`), playback between stations.
- The same sources render the social video (see D-056).
