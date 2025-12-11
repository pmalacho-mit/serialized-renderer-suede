import * as PIXI from "@pixi/webworker";
import { GlowFilter } from "pixi-filters";
import type {
  RendererInput,
  PixiByRendererInput,
  PropertiesByRendererInput,
  Scope,
} from ".";
import apply from "./apply";
import { setOrAppend } from "./utils";

const makeFilter = ({ type }: PropertiesByRendererInput["filters"]) =>
  type === "blur"
    ? new PIXI.BlurFilter()
    : type === "alpha"
    ? new PIXI.AlphaFilter()
    : type === "brightness"
    ? new PIXI.ColorMatrixFilter()
    : type === "glow"
    ? new GlowFilter({ color: 0xffff00 })
    : null;

type FilterHandler = (
  identifier: string,
  filter: PixiByRendererInput["filters"],
  config: PropertiesByRendererInput["filters"],
  scope: Scope
) => void;

const applyProperties: FilterHandler = (_, filter, config, scope) => {
  type Property = keyof typeof config;
  for (const key in config)
    apply.filters(filter, key as Property, config[key as Property], scope);
};

const store: FilterHandler = (
  identifier,
  filter,
  config,
  { lookup: { filters } }
) => {
  filters.byIdentifier.set(identifier, filter);
  filters.configBy.set(filter, config);
  filters.identifierBy.set(filter, identifier);
};

const tag: FilterHandler = (_, filter, config, scope) => {
  if (!config.tag) return;
  setOrAppend(scope.lookup.filters.byTag, config.tag, filter);
};

const attachToVisualByIdentifer: FilterHandler = (
  _,
  filter,
  config,
  { lookup: { sprites, graphics } }
) => {
  if (!config.include?.identifiers) return;
  for (const id of config.include.identifiers) {
    sprites.byIdentifier.get(id)?.filters!.push(filter as PIXI.Filter);
    graphics.byIdentifier.get(id)?.filters!.push(filter as PIXI.Filter);
  }
};

const attachToVisualByTag: FilterHandler = (
  _,
  filter,
  config,
  { lookup: { sprites, graphics } }
) => {
  if (!config.include?.tags) return;
  for (const tag of config.include.tags) {
    sprites.byTag
      .get(tag)
      ?.forEach((sprite) => sprite.filters!.push(filter as PIXI.Filter));
    graphics.byTag
      .get(tag)
      ?.forEach((graphic) => graphic.filters!.push(filter as PIXI.Filter));
  }
};

export const configure = (
  { filters }: Pick<RendererInput, "filters">,
  scope: Scope
) => {
  const handlers = [
    store,
    tag,
    applyProperties,
    attachToVisualByIdentifer,
    attachToVisualByTag,
  ];
  for (const identifier in filters) {
    const config = filters[identifier];
    const filter =
      scope.lookup.filters.byIdentifier.get(identifier) ?? makeFilter(config);
    if (!filter) throw new Error(`Unknown filter type: ${config.type}`);
    handlers.forEach((handler) => handler(identifier, filter, config, scope));
  }
};
