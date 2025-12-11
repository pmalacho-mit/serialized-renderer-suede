import {
  createScope,
  prepare,
  start,
  type Scope,
  load,
  getHit,
  animatePageFlip,
  inversePageFlip,
} from "./runtime";
import type * as PIXI from "@pixi/webworker";
import type {
  PickElements,
  Branded,
  Expand,
  RequireAtLeastOne,
  ExpandRecursively,
} from "./utils";

export {
  createScope,
  prepare,
  start,
  Scope,
  load,
  getHit,
  animatePageFlip,
  inversePageFlip,
};

export type AnchoredPosition = {
  /**
   * The value of this position, which can be thought of as the magnitude of the 1D vector from the `parent` anchor to the `self` anchor.
   *
   * (see the documentation on the `self` and `parent` properties of the `anchors` object for more information)
   */
  value: number;
  anchors: {
    /**
     * The positon on the imagery (sprite or graphic) where this position should correspond to.
     *
     * A value of 0.5 means the center of the imagery, and 0 means the left or top edge.
     *
     * When paired with the `parent` property, the `value` can be understood as the 1D vector from the `parent` anchor to this `self` anchor.
     */
    self: number;
    /**
     * The position from the imagery's parent (either the canvas or another imagery) that this position is calculated from.
     *
     * A value of 0.5 means the center of the parent, and 0 means the left or top edge.
     *
     * When paired with the `self` property, the `value` can be understood as the 1D vector from this `parent` anchor to the `self` anchor.
     */
    parent: number;
  };
};

type Dimensions = 1 | 2 | 3;

export type Axes<D extends Dimensions = 2> = PickElements<["x", "y", "z"], D>;

export type SizeUnits<D extends Dimensions = 2> = PickElements<
  ["width", "height", "depth"],
  D
>;

export type Position<D extends Dimensions = 2> = Record<
  Axes<D>,
  AnchoredPosition
>;

export type Size<D extends Dimensions = 2> = Record<SizeUnits<D>, number>;

export type Shape =
  | Branded<"rectangle", Size & Position>
  | Branded<"circle", { radius: number } & Position>
  | Branded<"rounded rectangle", Size & Position & { radius: number }>
  | Branded<"line", { thickness: number; points: Position[] }>
  | Branded<"ellipse", Size & Position>;

export type Childed = {
  /**
   * Currently, the parent relationship only affects the x, y, width, and height properties of children.
   * In this way, this can (only) be used to position and/or size a sprite or graphic relative to another.
   */
  parent: string;
};

export type Tagged = { tag: string };

export type ZIndexed = { zIndex: number };

export type Masked = { mask: string };

export type Clickable = { onClick: string[] };

export type Transparent = { alpha: number };

export type Proportional = { ratio: number };

export type Fill = { color: PIXI.ColorSource };

export type Inclusive = ExpandRecursively<{
  include: RequireAtLeastOne<Record<"tags" | "identifiers", string[]>>;
}>;

export type Graphic = Expand<
  Required<Shape & Fill> & Partial<Childed & Tagged & ZIndexed>
>;

export type Sprite = Expand<
  Required<Position & Proportional> &
    Partial<
      Size & Childed & Tagged & ZIndexed & Masked & Clickable & Transparent
    >
>;

export type Filter = Expand<
  Required<
    {
      type: "blur" | "alpha" | "brightness" | "glow";
      amount: number;
    } & Inclusive
  > &
    Partial<Tagged>
>;

export type Transitionables = {
  sprite: Sprite;
  graphic: Graphic;
  filter: Filter;
};

export type Transition<
  T extends keyof Transitionables,
  Property extends keyof Transitionables[T] = keyof Transitionables[T]
> = Branded<
  T,
  Required<
    Inclusive & {
      property: Property;
      frames: Transitionables[T][Property][];
      times: number[];
    }
  > &
    Partial<
      Tagged & {
        repeat?: boolean;
        totalDuration?: number;
      }
    >
>;

type TransitionableProperty = {
  [k in keyof Transitionables]: keyof Transitionables[k];
}[keyof Transitionables];

export type GenericTransition = Omit<
  Transition<keyof Transitionables>,
  "property"
> & {
  property: TransitionableProperty;
};

export type RendererInput = {
  sprites: Record<string, Sprite>;
  filters: Record<string, Filter>;
  graphics: Record<string, Graphic>;
  transitions: Record<string, GenericTransition>;
};

export type AliasLookup = { Alias: Record<string, { assetPath: string }> };

export type PixiByRendererInput = {
  sprites: PIXI.Sprite;
  filters: PIXI.Filter;
  graphics: PIXI.Graphics;
};

export type Spritesheet = PIXI.SpriteSheetJson;

export const transition = <
  T extends keyof Transitionables,
  Property extends keyof Transitionables[T] & TransitionableProperty
>(
  kind: T,
  property: Property,
  transition: Omit<Transition<T, Property>, "kind" | "property">
) =>
  ({
    ...transition,
    kind,
    property,
  } as GenericTransition);
