import * as PIXI from "@pixi/webworker";
import type { PixiByRendererInput, PropertiesByRendererInput } from "./";
import type { Scope } from "./scope";
import { set as setSprite } from "./visuals/sprite";
import { draw as drawGraphic } from "./visuals/graphic";
import { GlowFilter } from "pixi-filters";

export type ApplyPropertyTo<T extends keyof PixiByRendererInput> = <
  Property extends keyof PropertiesByRendererInput[T]
>(
  pixi: PixiByRendererInput[T],
  property: Property,
  value: PropertiesByRendererInput[T][Property],
  scope: Scope
) => void;

export default {
  sprites: (sprite, property, value, scope) => {
    const config = scope.lookup.sprites.configBy.get(sprite)!;
    config[property] = value;
    setSprite(sprite, scope, config);
  },
  filters: (filter, property, value, _) => {
    switch (property) {
      case "amount":
        const amount = value as PropertiesByRendererInput["filters"]["amount"];
        if (filter instanceof PIXI.BlurFilter) filter.blur = amount;
        else if (filter instanceof PIXI.AlphaFilter) filter.alpha = amount;
        // This will need to be adapted if we use ColorMatrixFilter for other purposes
        else if (filter instanceof PIXI.ColorMatrixFilter)
          filter.brightness(amount, false);
        else if (filter instanceof GlowFilter) filter.outerStrength = amount;
        return;
    }
  },
  graphics: (graphic, property, value, scope) => {
    const config = scope.lookup.graphics.configBy.get(graphic)!;
    config[property] = value;
    drawGraphic(graphic, scope, config);
  },
  containers: (container, property, value, scope) => {
    if (property === "alpha" && typeof value === "number")
      container.alpha = value === undefined ? 1 : value;
    else if (property === "mask" && typeof value === "string")
      container.mask =
        value === undefined
          ? null
          : scope.lookup.graphics.byIdentifier.get(value)!;
    else if (property === "flipped" && typeof value === "boolean") {
      container.pivot.x = scope.app.view.width;
      container.scale.x = -1;
    }
  },
} satisfies { [k in keyof PixiByRendererInput]: ApplyPropertyTo<k> };
