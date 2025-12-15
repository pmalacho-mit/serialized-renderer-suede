import { createScope, lifecyle, transition } from "../release";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;

const img = new Image();
img.src = "/rocko.png";

img.onload = async () => {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const scope = createScope(canvas);
  await lifecyle.prepare(scope, {
    graphics: {
      shape: {
        kind: "rectangle",
        //radius: { width: 0.1 },
        width: 0.2,
        height: 0.2,
        color: 0xff0000,
        x: { value: 0, anchors: { self: 0.5, parent: 1 } },
        y: { value: 0, anchors: { self: 0.5, parent: 0 } },
        parent: "/4x4grid.webp",
        useParentRotation: true,
      },
      shape2: {
        kind: "circle",
        radius: { width: 0.1 },
        color: 0xff0000,
        x: { value: 0, anchors: { self: 0.5, parent: 0 } },
        y: { value: 0, anchors: { self: 0.5, parent: 0 } },
        parent: "/4x4grid.webp",
        useParentRotation: true,
        zIndex: 2,
      },
      shape3: {
        kind: "rounded rectangle",
        radius: { width: 0.01 },
        width: 0.2,
        height: 0.2,
        color: 0x00ff00,
        x: { value: 0, anchors: { self: 0.5, parent: 0 } },
        y: { value: 0, anchors: { self: 0.5, parent: 1 } },
        parent: "/4x4grid.webp",
        useParentRotation: true,
      },
      shape4: {
        kind: "line",
        cap: "round",
        thickness: { width: 0.1 },
        points: [
          { x: { value: 0, parent: 0 }, y: { value: 0, parent: 0 } },
          { x: { value: 0, parent: 1 }, y: { value: 0, parent: 1 } },
        ],
        color: 0x0000ff,
        parent: "/4x4grid.webp",
        useParentRotation: true,
      },
    },
    sprites: {
      "/4x4grid.webp": {
        height: 0.5,
        x: { value: 0, anchors: { self: 0.5, parent: 0.5 } },
        y: { value: 0, anchors: { self: 0.5, parent: 0.5 } },
      },
      // "/rocko.png?id=hello2": {
      //   ratio,
      //   parent: "/rocko.png?id=hello",
      //   width: 0.5,
      //   x: { value: 0, anchors: { self: 0.5, parent: 0 } },
      //   y: { value: 0, anchors: { self: 0.5, parent: 0 } },
      // },
    },
    transitions: {
      "rotate grid": transition("sprite", "rotation", {
        include: {
          identifiers: ["/4x4grid.webp"],
        },
        frames: [0, 90, 180, 270, 360],
        times: [0, 1000, 2000, 3000, 4000],
      }),
    },
  });
  lifecyle.start(scope);
};
