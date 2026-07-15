Original prompt: Build a complete browser-based strategy board game called "Duck Deep". The request requires a fully playable client-side game using the provided SVG maps, duck sprite sheets, and coin sheet; exact-N graph movement; shared hidden coin pool; AI turns; hole occupancy; zone elimination and transitions; rare pearl victory; restart; tests; and browser verification.

## Progress

- Inspected repository: only README and provided assets existed at start.
- Inspected map metadata: every map uses viewBox `0 0 1200 900`; map SVGs expose `data-node-id`, `data-from`, `data-to`, `data-hole`, and final `data-goal` metadata.
- Confirmed hole counts from SVGs: Water Surface 8, Reed Zone 5, Shallow Water 3, Deep Sea 1, Rare Pearl goal at `n3_6`.
- Confirmed sprite sheets and coin sheet dimensions with system tools: all PNGs are 1448 x 1086.
- Confirmed sprite visual layout: duck sheets are 6 columns x 4 animation rows; coin sheet is 4 columns x 2 rows with identical front faces on the top row and values 1-4 on the bottom row.
- Added Vite + React + TypeScript project scaffold.
- Added pure game logic modules for graph parsing, seeded randomness, coin pools, exact graph movement, occupancy, AI scoring, zone transitions, victory/defeat, and restart state.
- Added responsive UI using the provided SVG and PNG assets, with real button controls, ARIA labels, visible focus states, and reduced-motion handling.
- Added `window.render_game_to_text` and `window.advanceTime` hooks for browser-game verification.
- Added Vitest coverage for core coin, movement, occupancy, zone, defeat, and restart rules.
- Installed dependencies and upgraded Vite/Vitest tooling to versions with a clean `npm audit` result.
- Ran `npm test`: 10 tests passing.
- Ran `npm run build`: production build passing.
- Browser smoke test found legal-move buttons animated their `transform`, making click targets unstable for Playwright; changed highlight animation to glow without moving the button.
- Reran `npm test` and `npm run build` after the highlight animation fix: both passing.
- Full UI automation completed a whole game through real browser interactions: Water Surface -> Reed Zone -> Shallow Water -> Deep Sea -> Rare Pearl; human victory; no console errors.
- Polished victory/defeat status strip to show `Game over` instead of a stale active turn.
- Final verification after status polish:
  - `npm test`: 10 tests passing.
  - `npm run build`: passing.
  - Web-game Playwright client screenshot/state capture: passing, no console errors reported.
  - DOM Playwright smoke test: coin flip, exact path move, AI response, restart all passing with no console errors.
  - DOM Playwright full-game run: reached Rare Pearl human victory in 10 human turns, no console errors.
  - Mobile screenshot at 390px width: no horizontal overflow.
- Fixed sprite/coin rendering after user screenshot feedback:
  - Ducks now render through a clipped sheet window with exact 6-column frame offsets, preventing double-frame artifacts.
  - Coins now render through clipped SVG crop windows, preserving round coin aspect instead of stretching the 4x2 sheet.
  - Desktop layout now places the coin tray in a right-side panel; mobile keeps coins above the board.
  - Rechecked screenshots for hidden and revealed coins, desktop board, and mobile layout.
  - `npm test`, `npm run build`, and Web-Game-Client capture all pass after the fix.
- Fixed remaining duck sprite loop issue after second screenshot feedback:
  - Replaced CSS transform-based sheet animation with React-controlled SVG viewBox frame crops.
  - Measured real sprite alpha bounds because the PNG frames are not on perfect `1448 / 6` grid boundaries.
  - Added per-row/per-frame crop centers and a custom movement-row Y crop to avoid bleeding neighboring frames/rows.
  - Verified idle and moving screenshots: no neighboring frame artifacts.
  - `npm test`, `npm run build`, and Web-Game-Client capture all pass after the loop fix.
- Packaged Duck Deep as an npm-installable React component:
  - Added `src/index.ts` public entry exporting `DuckDeepGame` and game types.
  - Added ESM library build config in `vite.lib.config.ts` and declaration-only build config in `tsconfig.lib.json`.
  - Updated `package.json` with package exports, React/ReactDOM peer dependencies, `files`, `sideEffects`, `prepack`, `pack:local`, and separate library/demo build scripts.
  - Added `duck-deep/style.css` as an exported CSS subpath with `dist/style.css.d.ts` so TypeScript consumers can import the stylesheet cleanly.
  - Verified `npm pack --json`: local tarball `duck-deep-1.0.0.tgz` is created and includes JS, CSS, declarations, package metadata, and README.
  - Verified a fresh Vite consumer under `output/consumer-smoke` can `npm install ../../duck-deep-1.0.0.tgz`, import `{ DuckDeepGame }` plus `duck-deep/style.css`, and run `npm run build`.
  - Re-ran `npm test`, `npm run build:app`, and Web-Game-Client screenshot/state capture after packaging changes.
- Added a no-React consumer path:
  - Added `src/element.tsx`, which defines the `<duck-deep-game>` custom element, exposes `mountDuckDeep()`, bundles React/ReactDOM internally, and injects the game CSS into a shadow root.
  - Added `vite.element.config.ts` and updated `build:lib` so `dist/duck-deep.element.js` is built alongside the existing React component package entry.
  - Added `./element` package export and marked the React peer dependencies optional so a vanilla website does not need to install or import React.
  - Updated README with Web Component, manual mount, and direct `type="module"` script examples.
  - Verified a fresh Vite consumer under `output/vanilla-smoke` with no React dependencies can install `duck-deep-1.0.0.tgz`, import `mountDuckDeep` from `duck-deep/element`, and run `npm run build`.
  - Confirmed `npm ls react --depth=0` in the vanilla consumer is empty.
  - Verified the vanilla Web Component in a real browser with Web-Game-Client screenshot/state capture.
  - Re-ran `npm test`, `npm run build`, `npm run build:app`, and `npm pack --json`.

## TODO

- No known blockers.
- Future polish idea: tune duck piece scale on very narrow screens if the board should feel less crowded.
- Publishing note: the library bundles intentionally embed the PNG/SVG assets for simple npm consumption. The package tarball is now about 10 MB because it includes both the React-component entry and the standalone Web Component entry.
- Balance pass requested by the user: redesigned all playable SVG maps so every hole is a one-entrance dead end, and disallowed revisiting a node within one exact-N move to prevent spending steps by bouncing back and forth.
- Balance verification: 12/12 Vitest tests pass, app and npm-library builds pass, screenshots show the revised paths correctly, a real browser turn completed without console errors, and an automated full game reached the Rare Pearl normally after crossing all four playable zones.
