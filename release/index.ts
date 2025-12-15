import type * as PIXI from "@pixi/webworker";
import type { GlowFilter } from "pixi-filters";
import type { Easing } from "./easing";
import type {
  PickElements,
  Branded,
  Expand,
  RequireAtLeastOne,
  ExpandRecursively,
} from "./utils";

export { replace as prepare, start, lifecyle } from "./runtime";
export { getHit } from "./query";
export { createScope, type Scope } from "./scope";

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

export type RelativeLength = { width: number } | { height: number };

export type RelativeRadius = { radius: RelativeLength };

export type LinePoint = Record<Axes<2>, { value: number; parent: number }>;

export type Shape =
  | Branded<"rectangle", Size & Position & Fill>
  | Branded<"circle", RelativeRadius & Position & Fill>
  | Branded<"rounded rectangle", RelativeRadius & Size & Position & Fill>
  | Branded<
      "line",
      {
        thickness: RelativeLength;
        points: LinePoint[];
        cap?: "butt" | "round" | "square";
      } & Fill
    >
  | Branded<"ellipse", Size & Position & Fill>;

export type Childed = {
  /**
   * Currently, the parent relationship only affects the x, y, width, and height properties of children.
   * In this way, this can (only) be used to position and/or size a sprite or graphic relative to another.
   */
  parent: string;
  /**
   * If true, the parent's rotation will be leveraged when calculating this visual's position.
   */
  useParentRotation: boolean;
};

export type Tagged = { tag: string };

export type ZIndexed = { zIndex: number };

export type Masked = { mask: string };

export type Clickable = { onClick: string[] };

export type Transparent = { alpha: number };

export type Proportional = { ratio: number };

export type Fill = { color: PIXI.ColorSource };

export type Eased = { easing: Easing };

export type Rotated = { rotation: number };

export type Contained = { container: string };

export type Flipped = { flipped: true };

export type Repeated = { repeat: true };

export type Inclusive = ExpandRecursively<{
  include: RequireAtLeastOne<Record<"tags" | "identifiers", string[]>>;
}>;

export type Sprite = Expand<
  Required<Position> &
    Partial<
      Size &
        Childed &
        Tagged &
        ZIndexed &
        Masked &
        Clickable &
        Transparent &
        Rotated &
        Contained
    >
>;

type NoRotatedLines =
  | { kind: "line"; rotation: never }
  | { kind: Exclude<Shape["kind"], "line">; rotation: number };

export type Graphic = Expand<
  Shape &
    Required<Fill> &
    Partial<
      Childed &
        Tagged &
        ZIndexed &
        Masked &
        Contained &
        Transparent &
        Rotated &
        NoRotatedLines
    >
>;

export type Container = Expand<
  Required<Size & Position> & Partial<Transparent & Masked & Flipped>
>;

export type Filter = Expand<
  Required<
    {
      amount: number;
    } & Inclusive &
      (
        | {
            type: "blur" | "alpha" | "brightness";
          }
        | {
            type: "glow";
            color?: PIXI.ColorSource;
          }
      )
  > &
    Partial<Tagged>
>;

export type Transitionables = {
  container: Container;
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
    Partial<Tagged & Eased & Repeated>
>;

export type TransitionableProperty = {
  [k in keyof Transitionables]: keyof Transitionables[k];
}[keyof Transitionables];

export type GenericTransition = Omit<
  Transition<keyof Transitionables>,
  "property" | "frames"
> & {
  property: TransitionableProperty;
  frames: unknown[];
};

export type PropertiesByRendererInput = {
  containers: Container;
  sprites: Sprite;
  filters: Filter;
  graphics: Graphic;
  transitions: GenericTransition;
};

export type RendererInput = {
  [k in keyof PropertiesByRendererInput]: Record<
    string,
    PropertiesByRendererInput[k]
  >;
};

export type AliasLookup = { aliases: Record<string, string> };

export type PixiByRendererInput = {
  containers: PIXI.Container;
  sprites: PIXI.Sprite;
  filters: PIXI.Filter | GlowFilter;
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
