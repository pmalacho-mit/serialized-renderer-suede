import * as PIXI from "@pixi/webworker";
import type { AliasLookup, RendererInput } from "./";
import { configure as configureTransitions } from "./transitions";
import { configure as configureVisuals } from "./visuals";
import { configure as configureFilters } from "./filters";
import lookup from "./lookup";
import type { Scope } from "./scope";

const getLocater =
  ({ assetPrefix }: Pick<Scope, "assetPrefix">) =>
  (id: string) =>
    (assetPrefix ?? "") + id;

type Input = Partial<RendererInput & AliasLookup>;

export const loadTextures = async (
  scope: Scope,
  input: Input,
  locate?: ReturnType<typeof getLocater>
) => {
  const { sprites } = input;
  if (!sprites) return {};

  locate ??= getLocater(scope);

  if (scope.spritesheets) {
    if (!scope.texturesFromSheet) {
      const textures = await Promise.all(
        Object.values(scope.spritesheets).map(async (sheet) => {
          const base = PIXI.BaseTexture.from(locate(sheet.meta.image));
          const spritesheet = new PIXI.Spritesheet(base, sheet);
          await spritesheet.parse();
          await Promise.all(
            Object.keys(sprites)
              .map((sprite) => spritesheet.textures[sprite])
              .filter(Boolean)
              .map((texture) => new Promise((r) => texture.on("update", r)))
          );
          return spritesheet.textures;
        })
      );
      scope.texturesFromSheet = Object.assign({}, ...textures);
    }
    return scope.texturesFromSheet!;
  } else
    return PIXI.Assets.load<PIXI.Texture>(Object.keys(sprites).map(locate));
};

export const replace = async (scope: Scope, input: Input) => {
  console.time("prepare");
  const { app, parentByChild, childrenByParent } = scope;
  app.stop();

  for (const key of ["sprites", "graphics", "filters", "containers"] as const)
    lookup.prune(scope.lookup[key], input[key], "clear tags");

  lookup.clean(scope.lookup.transitions);

  parentByChild.clear();
  childrenByParent.clear();

  const locate = getLocater(scope);

  const textures = await loadTextures(scope, input, locate);

  scope.app.stage.removeChild(scope.container);
  scope.app.stage.addChild(scope.container);

  configureVisuals(
    input,
    scope,
    (identifier) => {
      const sprite = PIXI.Sprite.from(
        textures[identifier] ?? textures[locate(identifier)]
      );
      sprite.anchor.set(0.5);
      return sprite;
    },
    () => new PIXI.Graphics()
  );

  configureFilters(input, scope);
  configureTransitions(input, scope);

  scope.container.sortableChildren = true;
  scope.container.sortChildren();

  scope.elapsedTimeSeconds = 0;

  if (scope.flipped) {
    scope.container.pivot.x = scope.app.view.width;
    scope.container.scale.x = -1;
  }

  scope.startTimeSeconds = performance.now();
  scope.app.ticker.update();
  scope.app.stop();
  console.timeEnd("prepare");
};

export const start = (scope: Scope) => {
  scope.startTimeSeconds = performance.now();
  scope.app.start();
};

export const lifecyle = {
  prepare: replace,
  start,
};
