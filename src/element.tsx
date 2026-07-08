import React from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import styles from "./styles.css?inline";

export const DUCK_DEEP_TAG_NAME = "duck-deep-game";

export interface DuckDeepMount {
  element: HTMLElement;
  unmount: () => void;
}

declare global {
  interface Window {
    DuckDeep?: {
      defineDuckDeepElement: typeof defineDuckDeepElement;
      mount: typeof mountDuckDeep;
    };
  }
}

const hostStyles = `
:host {
  display: block;
  min-width: 320px;
  color: #122033;
  background: #dbe9ec;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --panel: rgba(255, 255, 255, 0.88);
  --ink-soft: #49606f;
  --blue: #1768b7;
  --green: #27764a;
  --gold: #e6aa2a;
  --focus: #091f3f;
}
`;

function createDuckDeepElementClass() {
  return class DuckDeepElement extends HTMLElement {
    private root: Root | null = null;
    private mountPoint: HTMLDivElement | null = null;

    connectedCallback() {
      if (this.root) return;

      const shadowRoot = this.shadowRoot ?? this.attachShadow({ mode: "open" });
      if (!this.mountPoint) {
        const style = document.createElement("style");
        style.textContent = `${hostStyles}\n${styles}`;

        this.mountPoint = document.createElement("div");
        shadowRoot.append(style, this.mountPoint);
      }

      this.root = createRoot(this.mountPoint);
      this.root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    }

    disconnectedCallback() {
      this.root?.unmount();
      this.root = null;
    }
  };
}

export function defineDuckDeepElement(tagName = DUCK_DEEP_TAG_NAME): void {
  if (typeof window === "undefined" || !("customElements" in window)) return;
  if (window.customElements.get(tagName)) return;

  window.customElements.define(tagName, createDuckDeepElementClass());
}

export function mountDuckDeep(target: Element | string): DuckDeepMount {
  const parent =
    typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;

  if (!parent) {
    throw new Error(`Duck Deep mount target was not found: ${String(target)}`);
  }

  defineDuckDeepElement();

  const element = document.createElement(DUCK_DEEP_TAG_NAME);
  parent.append(element);

  return {
    element,
    unmount: () => element.remove(),
  };
}

defineDuckDeepElement();

if (typeof window !== "undefined") {
  window.DuckDeep = {
    defineDuckDeepElement,
    mount: mountDuckDeep,
  };
}
