import type {
  PixiByRendererInput,
  PropertiesByRendererInput,
  RendererInput,
  Scope,
} from "./";

export type LookupItem<Key extends keyof RendererInput> =
  Key extends keyof PixiByRendererInput
    ? PixiByRendererInput[Key]
    : PropertiesByRendererInput[Key];

export type Lookup<Key extends keyof RendererInput> = {
  byIdentifier: Map<string, LookupItem<Key>>;
  byTag: Map<string, LookupItem<Key>[]>;
} & (Key extends keyof PixiByRendererInput
  ? {
      configBy: Map<LookupItem<Key>, PropertiesByRendererInput[Key]>;
      identifierBy: Map<LookupItem<Key>, string>;
    }
  : {});

export type Lookups = {
  [K in keyof RendererInput]: Lookup<K>;
};

const clearAll = (_lookup: Lookup<keyof RendererInput>) => {
  for (const key in _lookup) _lookup[key as keyof typeof _lookup].clear();
};

const lookup = {
  pixi: (key: keyof PixiByRendererInput): Lookup<typeof key> => ({
    byIdentifier: new Map(),
    byTag: new Map(),
    configBy: new Map(),
    identifierBy: new Map(),
  }),
  nonPixi: (
    key: Exclude<keyof RendererInput, keyof PixiByRendererInput>
  ): Lookup<typeof key> => ({
    byIdentifier: new Map(),
    byTag: new Map(),
  }),
  create: <K extends keyof RendererInput>(key: K): Lookup<K> => {
    switch (key) {
      case "sprites":
      case "graphics":
      case "filters":
      case "containers":
        return lookup.pixi(key) as unknown as Lookup<K>;
      case "transitions":
        return lookup.nonPixi(key) as unknown as Lookup<K>;
    }
  },
  factory: (): Lookups => ({
    sprites: lookup.create("sprites"),
    graphics: lookup.create("graphics"),
    filters: lookup.create("filters"),
    containers: lookup.create("containers"),
    transitions: lookup.create("transitions"),
  }),
  prune: <K extends keyof PixiByRendererInput>(
    lookup: Lookup<K>,
    current: Partial<RendererInput>[
      | "sprites"
      | "graphics"
      | "containers"
      | "filters"],
    tagBehavior: "keep tags" | "clear tags" = "keep tags"
  ) => {
    if (!current) return clearAll(lookup);
    const set = new Set(Object.keys(current));
    for (const [identifier, item] of lookup.byIdentifier) {
      if (set.has(identifier)) continue;
      lookup.byIdentifier.delete(identifier);
      lookup.configBy.delete(item as any);
      lookup.identifierBy.delete(item as any);
      item.destroy();
    }
    if (tagBehavior === "clear tags") lookup.byTag.clear();
  },
  clean: <K extends keyof RendererInput>(lookup: Lookup<K>) => {
    lookup.byIdentifier.clear();
    lookup.byTag.clear();
    if ("configBy" in lookup) {
      for (const item of lookup.configBy.keys()) item.destroy();
      lookup.configBy.clear();
      lookup.identifierBy.clear();
    }
  },
};

export default lookup;
