import { RendererInput, Transitionables, type GenericTransition } from ".";
import apply, { type ApplyPropertyTo } from "./apply";
import type { Scope } from "./runtime";
import { lerp } from "./lerp";
import { Pluralize, pluralize, setOrAppend } from "./utils";
import { Lookup } from "./lookup";

type WithCurrentFrame = { currentFrame: number };

const invalidFrame = -1;

function withCurrentFrame(
  transition: GenericTransition
): asserts transition is GenericTransition & WithCurrentFrame {
  (transition as any as WithCurrentFrame).currentFrame ??= invalidFrame;
}

function setCurrentFrame(
  transition: GenericTransition,
  { elapsedTimeSeconds: timeSeconds }: Scope
): asserts transition is GenericTransition & WithCurrentFrame {
  withCurrentFrame(transition);
  const { times, currentFrame } = transition;
  if (currentFrame === invalidFrame || currentFrame === undefined)
    transition.currentFrame = timeSeconds < times[0] ? invalidFrame : 0;
  else if (
    currentFrame >= times.length - 1 ||
    times[currentFrame + 1] > timeSeconds
  )
    return;
  else transition.currentFrame!++;
}

export const tryLerpToNextFrame = (
  { frames, currentFrame, times }: GenericTransition & WithCurrentFrame,
  { elapsedTimeSeconds }: Scope
) => {
  const nextIndex = currentFrame! + 1;
  if (nextIndex > frames.length - 1) return null;
  const start = frames[currentFrame!]!;
  const end = frames[nextIndex]!;
  const startTime = times[currentFrame!];
  const timeRatio =
    (elapsedTimeSeconds - startTime) / (times[nextIndex] - startTime);
  return lerp(start as any, end, Math.min(timeRatio, 1)) as typeof start;
};

const performTransition = <T extends keyof Transitionables>(
  transition: GenericTransition,
  scope: Scope,
  lookup: Lookup<Pluralize<T>>,
  apply: ApplyPropertyTo<Pluralize<T>>
) => {
  const { property, include, frames, times } = transition;

  setCurrentFrame(transition, scope);

  if (
    transition.currentFrame === -1 ||
    transition.currentFrame === frames.length ||
    transition.times[0] === null
  )
    return;

  if (
    transition.repeat &&
    transition.currentFrame === frames.length - 1 &&
    times[transition.currentFrame] < scope.elapsedTimeSeconds
  ) {
    transition.totalDuration ??=
      transition.times.at(-1)! - transition.times.at(0)!;
    transition.currentFrame = 0;
    transition.times = times.map((time) => time + transition.totalDuration!);
  }

  try {
    const value =
      tryLerpToNextFrame(transition, scope) ??
      frames[transition.currentFrame!]!;
    if (include.identifiers)
      for (const id of include.identifiers) {
        const pixi = lookup.byIdentifier.get(id)!;
        apply(pixi as any, property as any, value as any, scope);
      }
    if (include.tags)
      for (const tag of include.tags)
        if (lookup.byTag.has(tag))
          for (const pixi of lookup.byTag.get(tag)!)
            apply(pixi as any, property as any, value as any, scope);
  } catch (e) {
    console.error(
      `Unable to perform transition: ${JSON.stringify(transition)}; error: ${e}`
    );
  }
};

export const perform = (scope: Scope) => {
  const {
    lookup: { transitions },
    startTimeSeconds,
  } = scope;
  scope.elapsedTimeSeconds = (performance.now() - startTimeSeconds) / 1000;
  for (const [_, transition] of transitions.byIdentifier) {
    const key = pluralize(transition.kind);
    performTransition<typeof transition.kind>(
      transition,
      scope,
      scope.lookup[key],
      apply[key] as ApplyPropertyTo<Pluralize<typeof transition.kind>>
    );
  }
};

export const configure = (
  { transitions }: Pick<RendererInput, "transitions">,
  { lookup }: Scope
) => {
  for (const identifier in transitions) {
    const config = transitions[identifier];
    lookup.transitions.byIdentifier.set(identifier, config);
    if (config.tag) setOrAppend(lookup.transitions.byTag, config.tag, config);
  }
};
