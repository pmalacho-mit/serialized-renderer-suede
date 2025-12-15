export const setOrAppend = <Key, Item>(
  map: Map<Key, Item[]>,
  key: Key,
  ...item: Item[]
) => (map.has(key) ? map.get(key)!.push(...item) : map.set(key, [...item]));

export type WithoutNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

/**
 * Picks the first N elements from a tuple and returns their union.
 *
 * @template Arr - The tuple array to pick elements from
 * @template N - The number of elements to pick from the start of the tuple
 * @template Result - Internal accumulator for recursion (DO NOT PROVIDE)
 *
 * @example
 * type FirstTwo = PickElements<["x", "y", "z"], 2>; // "x" | "y"
 * type FirstOne = PickElements<["a", "b", "c"], 1>; // "a"
 * type All = PickElements<["foo", "bar"], 3>; // "foo" | "bar"
 */
export type PickElements<
  Arr extends readonly any[],
  N extends number,
  Result extends any[] = []
> = Result["length"] extends N
  ? Result[number]
  : Arr extends readonly [infer First, ...infer Rest]
  ? PickElements<Rest, N, [...Result, First]>
  : Result[number];

export type Branded<Kind, X = {}> = { kind: Kind } & X;

/**
 * Expands an object type to show all its properties explicitly.
 * Useful for improving type readability in IDE tooltips.
 *
 * @template T - The type to expand
 * @returns The same type with all properties explicitly shown
 *
 * @example
 * ```ts
 * type Combined = { a: string } & { b: number };
 * type Expanded = Expand<Combined>; // { a: string; b: number }
 * ```
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Expand<
  Pick<T, Exclude<keyof T, Keys>> &
    {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
    }[Keys]
>;

export type _RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type Pluralize<T extends string> = `${T}s`;

export const pluralize = <T extends string>(singular: T) =>
  (singular.endsWith("s") ? singular : `${singular}s`) as Pluralize<T>;

export const singularize = <T extends string>(plural: T) =>
  (plural.endsWith("s")
    ? plural.slice(0, -1)
    : plural) as T extends `${infer S}s` ? S : never;

export const upper = <T extends string>(str: T) =>
  str.toUpperCase() as Uppercase<T>;
