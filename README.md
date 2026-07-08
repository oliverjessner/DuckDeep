# Duck Deep

Quack your way down.

Duck Deep is a complete client-side browser strategy board game built with TypeScript and packaged for plain websites or React apps.

## Use In A Plain Website

Install the package:

```bash
npm install duck-deep
```

Use the Web Component from your JavaScript:

```js
import "duck-deep/element";
```

Then place the game in HTML:

```html
<duck-deep-game></duck-deep-game>
```

No React setup or CSS import is needed for this path.

You can also mount it manually:

```js
import { mountDuckDeep } from "duck-deep/element";

mountDuckDeep("#duck-deep");
```

```html
<div id="duck-deep"></div>
```

For a direct script after a local package install:

```html
<script type="module" src="./node_modules/duck-deep/dist/duck-deep.element.js"></script>
<duck-deep-game></duck-deep-game>
```

## Use In A React App

If your app already uses React, render the component directly:

```tsx
import { DuckDeepGame } from "duck-deep";
import "duck-deep/style.css";

export function App() {
  return <DuckDeepGame />;
}
```

For local testing before publishing:

```bash
npm run pack:local
npm install ./duck-deep-1.0.0.tgz
```

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

`npm run build` creates the npm package bundle in `dist/`.
`npm run build:app` creates the standalone demo app in `dist-app/`.
