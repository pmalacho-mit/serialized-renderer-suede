import type * as PIXI from "@pixi/webworker";
import type {
  AnchoredPosition,
  PixiByRendererInput,
  PropertiesByRendererInput,
  RendererInput,
} from "..";
import type { Scope } from "../scope";
import { setOrAppend } from "../utils";
import { draw as drawGraphic } from "./graphic";
import { set as setSprite } from "./sprite";
import type { Lookup, LookupItem } from "../lookup";

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
export type Visual = PixiByRendererInput[Visuals];

type Size = { width: number; height: number };
type Center = { x: number; y: number };
export type Parent = Center & Size & { rotation?: number };

export const point: Size = { width: 0, height: 0 };

export const rootParent = ({
  app: {
    screen: { width, height },
  },
}: Scope): Parent => ({ width, height, x: width / 2, y: height / 2 });

export const isSprite = (
  query: Visual
): query is PixiByRendererInput["sprites"] => query.isSprite;

const calculateLocalOffset = (
  { value, anchors }: AnchoredPosition,
  dimension: "x" | "y",
  self: number,
  parent: Parent
) => {
  const unit = dimension === "x" ? "width" : "height";
  return (
    parent[unit] * (-0.5 + anchors.parent + value) + self * (0.5 - anchors.self)
  );
};

export const apply2DTransform = (
  target: Pick<Visual, "x" | "y">,
  x: AnchoredPosition,
  y: AnchoredPosition,
  width: number,
  height: number,
  parent: Parent,
  useParentRotation: boolean
) => {
  const offsetX = calculateLocalOffset(x, "x", width, parent);
  const offsetY = calculateLocalOffset(y, "y", height, parent);
  if (useParentRotation && parent.rotation) {
    const cos = Math.cos(parent.rotation);
    const sin = Math.sin(parent.rotation);
    const rotatedX = offsetX * cos - offsetY * sin;
    const rotatedY = offsetX * sin + offsetY * cos;
    target.x = parent.x + rotatedX;
    target.y = parent.y + rotatedY;
  } else {
    target.x = parent.x + offsetX;
    target.y = parent.y + offsetY;
  }
};

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

export const create = <Key extends Exclude<Visuals, "containers">>(
  configs: Configs<Key>,
  { byIdentifier, byTag, configBy, identifierBy }: Lookup<Key>,
  make: Factory<Key>,
  childrenByIdentifier: Map<string, Visual[]>
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

const findSprite = (
  identifier: string,
  sprites: Lookup<"sprites">,
  aliases: Scope["aliases"]
) => {
  const fromIdentifier = sprites.byIdentifier.get(identifier);
  if (fromIdentifier) return fromIdentifier;
  if (aliases) {
    const fromAlias = sprites.byIdentifier.get(aliases[identifier]);
    if (fromAlias) return fromAlias;
  }
  throw new Error(`Sprite with identifier "${identifier}" not found.`);
};

const formRelationships = (
  {
    childrenByParent,
    parentByChild,
    lookup: { sprites },
    aliases: alias,
  }: Scope,
  childrenByIdentifier: Map<string, Visual[]>
) => {
  for (const [identifier, children] of childrenByIdentifier) {
    const parent = findSprite(identifier, sprites, alias);
    setOrAppend(childrenByParent, parent, ...children);
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

const setupMasks = <K extends Visuals>(
  key: K,
  record: RendererInput[K],
  scope: { lookup: Record<K, Lookup<K>> }
) => {
  for (const [identifier, spriteConfig] of Object.entries(record)) {
    const { mask } = spriteConfig;
    if (!mask) continue;
    const element = scope.lookup[key].byIdentifier.get(identifier);
    const graphic = scope.lookup[key].byIdentifier.get(mask);
    if (!element || !graphic) continue;
    element.mask = graphic;
  }
};

export const configure = (
  { graphics, sprites }: Partial<Pick<RendererInput, Visuals>>,
  scope: Scope,
  makeSprite: Factory<"sprites">,
  makeGraphic: Factory<"graphics">
) => {
  const { lookup } = scope;
  const childrenByIdentifier = new Map<string, Visual[]>();
  if (graphics)
    create(graphics, lookup.graphics, makeGraphic, childrenByIdentifier);
  if (sprites)
    create(sprites, lookup.sprites, makeSprite, childrenByIdentifier);
  formRelationships(scope, childrenByIdentifier);
  if (sprites) setupMasks("sprites", sprites, scope);
  if (graphics) setupMasks("graphics", graphics, scope);
  initialize(lookup.sprites, scope, setSprite);
  initialize(lookup.graphics, scope, drawGraphic);
};
