import type * as PIXI from "@pixi/webworker";
import type {
  AnchoredPosition,
  PixiByRendererInput,
  PropertiesByRendererInput,
  RendererInput,
} from "..";
import type { Scope } from "../runtime";
import { setOrAppend } from "../utils";
import { draw as drawGraphic } from "./graphic";
import { set as setSprite } from "./sprite";
import { Lookup, LookupItem } from "../lookup";

/**
 * Visuals are things that can be rendered on screen (sprites and graphics),
 * which are different than filters which affect how visuals are rendered,
 * and transitions which update properties of visuals and/or filters over time.
 */
type Visuals = "sprites" | "graphics";

/**
 * Currently only sprites can be used as parents,
 * but with development effort (need a method to isolate the top left corner position (x,y) of graphics and get their dimensions)
 * graphics can be also.
 */
export type ParentVisual = PixiByRendererInput["sprites"];
export type Visual = PixiByRendererInput["sprites" | "graphics"];

type Size = { width: number; height: number };
type Center = { x: number; y: number };
export type Parent = Center & Size;

export const point: Size = { width: 0, height: 0 };

export const rootParent = ({
  app: {
    screen: { width, height },
  },
}: Scope): Parent => ({ width, height, x: width / 2, y: height / 2 });

export const isSprite = (
  query: Visual
): query is PixiByRendererInput["sprites"] => query.isSprite;

export const resolvePosition = (
  { value, anchors }: AnchoredPosition,
  dimension: "x" | "y",
  self: Size,
  parent: Parent
) => {
  const unit = dimension === "x" ? "width" : "height";
  return (
    parent[dimension] -
    parent[unit] / 2 +
    anchors.parent * parent[unit] +
    (0.5 - anchors.self) * self[unit] +
    parent[unit] * value
  );
};

const childrenByIdentifier = new Map<string, Visual[]>();

export type Factory<Key extends Visuals> = (
  identifier: string,
  config: PropertiesByRendererInput[Key]
) => PixiByRendererInput[Key];

export type Setter<Key extends Visuals> = (
  item: PixiByRendererInput[Key],
  scope: Scope,
  config?: PropertiesByRendererInput[Key]
) => void;

type Configs<Key extends Visuals> = Record<
  string,
  PropertiesByRendererInput[Key]
>;

export const create = <Key extends Visuals>(
  configs: Configs<Key>,
  { byIdentifier, byTag, configBy, identifierBy }: Lookup<Key>,
  make: Factory<Key>
) => {
  for (const identifier in configs) {
    const config = configs[identifier];
    const pixi = byIdentifier.get(identifier) ?? make(identifier, config);
    pixi.filters = [];
    byIdentifier.set(identifier, pixi as LookupItem<Key>);
    if (config.tag) setOrAppend(byTag, config.tag, pixi);
    if (config.parent) setOrAppend(childrenByIdentifier, config.parent, pixi);
    configBy.set(
      pixi satisfies Visual as any,
      config satisfies PropertiesByRendererInput[Key] as any
    );
    identifierBy.set(pixi satisfies Visual as any, identifier);
  }
};

const formRelationships = ({
  childrenByParent,
  parentByChild,
  lookup: { sprites: Sprite },
  alias,
}: Scope) => {
  for (const [identifier, children] of childrenByIdentifier) {
    const parent = (Sprite.byIdentifier.get(identifier) ??
      Sprite.byIdentifier.get(alias[identifier].assetPath))!; // since only sprites can be parents (for now)
    childrenByParent.set(parent, children);
    for (const child of children) parentByChild.set(child, parent);
  }
};

const initialize = <Key extends Visuals>(
  { configBy }: Lookup<Key>,
  scope: Scope,
  set: Setter<Key>
) => {
  const { parentByChild, container } = scope;
  for (const [item, config] of configBy) {
    container.addChild(item as PIXI.Sprite | PIXI.Graphics);
    if (parentByChild.has(item)) continue; // children will be set via the parent setter
    set(
      item satisfies Visual as any,
      scope,
      config satisfies PropertiesByRendererInput[Visuals] as any
    );
  }
};

const setupMasks = (sprites: RendererInput["sprites"], scope: Scope) => {
  for (const [spriteId, spriteConfig] of Object.entries(sprites)) {
    const { mask } = spriteConfig;
    if (!mask) continue;
    const sprite = scope.lookup.sprites.byIdentifier.get(spriteId);
    const graphic = scope.lookup.graphics.byIdentifier.get(mask);
    if (!sprite || !graphic) continue;
    sprite.mask = graphic;
  }
};

export const configure = (
  { graphics, sprites }: Pick<RendererInput, Visuals>,
  scope: Scope,
  makeSprite: Factory<"sprites">,
  makeGraphic: Factory<"graphics">
) => {
  const { lookup } = scope;
  childrenByIdentifier.clear();
  create(graphics, lookup.graphics, makeGraphic);
  create(sprites, lookup.sprites, makeSprite);
  formRelationships(scope);
  setupMasks(sprites, scope);
  initialize(lookup.sprites, scope, setSprite);
  initialize(lookup.graphics, scope, drawGraphic);
};
