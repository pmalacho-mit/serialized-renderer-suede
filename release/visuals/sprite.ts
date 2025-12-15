import type * as PIXI from "@pixi/webworker";
import { isSprite, apply2DTransform } from ".";
import type { Scope } from "../scope";
import type { PixiByRendererInput, Sprite } from "..";
import { type Parent, rootParent } from ".";
import { draw as drawGraphic } from "./graphic";

const applyTransform = (
  sprite: PixiByRendererInput["sprites"],
  { x, y, useParentRotation }: Pick<Sprite, "x" | "y" | "useParentRotation">,
  parent: Parent
) => {
  useParentRotation ??= false;
  const { width, height } = sprite;
  apply2DTransform(sprite, x, y, width, height, parent, useParentRotation);
};

const getRatio = ({
  texture: {
    baseTexture: { width, height },
  },
}: PixiByRendererInput["sprites"]) => width / height;

export const set = (
  sprite: PixiByRendererInput["sprites"],
  scope: Scope,
  config?: Sprite,
  parent?: Parent
) => {
  const {
    parentByChild,
    childrenByParent,
    lookup: { sprites: lookup },
  } = scope;
  parent ??= parentByChild.get(sprite) ?? rootParent(scope);
  config ??= lookup.configBy.get(sprite)!;

  const { x, y, height, width, zIndex, rotation } = config!;
  const ratio = getRatio(sprite);

  if (height && width) {
    sprite.height = parent.height * height;
    sprite.width = parent.width * width;
  } else if (height) {
    sprite.height = parent.height * height;
    sprite.width = sprite.height * ratio;
  } else if (width) {
    sprite.width = parent.width * width;
    sprite.height = sprite.width / ratio!;
  }

  applyTransform(sprite, config, parent);

  // TODO: Should this be relative to parent?
  if (rotation !== undefined) sprite.rotation = rotation * 2 * Math.PI;

  if (zIndex !== undefined) sprite.zIndex = zIndex;

  if (!childrenByParent.has(sprite)) return;
  for (const child of childrenByParent.get(sprite)!)
    isSprite(child)
      ? set(child, scope, undefined, sprite)
      : drawGraphic(child, scope, undefined, sprite);
};
