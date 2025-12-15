import * as PIXI from "@pixi/webworker";
import type { AliasLookup, Spritesheet } from "./";
import { perform as performTransitions } from "./transitions";
import { type ParentVisual, type Visual } from "./visuals";
import lookup, { type Lookups } from "./lookup";

export type Scope = {
  app: PIXI.Application;
  container: PIXI.Container;
  assetPrefix?: string;
  lookup: Lookups;
  childrenByParent: Map<ParentVisual, Visual[]>;
  parentByChild: Map<Visual, ParentVisual>;
  startTimeSeconds: number;
  elapsedTimeSeconds: number;
  aliases?: AliasLookup["aliases"];
  spritesheets?: Spritesheet[];
  texturesFromSheet?: Record<string, PIXI.Texture<PIXI.Resource>>;
  flipped?: boolean;
};

export const createScope = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  assetPrefix?: string,
  spritesheets?: Spritesheet[],
  flipped?: boolean
) => {
  const scope: Scope = {
    container: new PIXI.Container(),
    app: new PIXI.Application({
      view: canvas as PIXI.ICanvas,
      backgroundAlpha: 0,
      backgroundColor: "#fff",
      width: canvas.width,
      height: canvas.height,
    }),
    lookup: lookup.factory(),
    childrenByParent: new Map(),
    parentByChild: new Map(),
    elapsedTimeSeconds: 0,
    startTimeSeconds: performance.now(),
    assetPrefix,
    aliases: undefined as any as Scope["aliases"],
    spritesheets,
    texturesFromSheet: undefined,
    flipped,
  };

  scope.app.stage.addChild(scope.container);
  scope.app.ticker.add(performTransitions.bind(null, scope));
  scope.app.stage.sortableChildren = true;

  return scope;
};
