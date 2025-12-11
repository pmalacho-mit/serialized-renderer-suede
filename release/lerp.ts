import easingsFunctions from "./easing";

interface Lerpable {
  [key: string]: number | number[] | Lerpable;
}

export const lerp = <T extends Lerpable[string]>(
  start: T,
  end: T,
  amount: number,
  easing: keyof typeof easingsFunctions = "linear"
): T => {
  if (Array.isArray(start) && Array.isArray(end))
    return start.map((x, i) => lerp(x, end[i], amount, easing)) as T;
  else if (typeof start === "object" && typeof end === "object") {
    const result = {} as T;
    for (const key in start) {
      result[key as keyof T] = lerp(
        start[key] as Lerpable,
        end[key] as Lerpable,
        amount,
        easing
      ) as T[keyof T];
    }
    return result;
  } else if (typeof start === "number" && typeof end === "number")
    return (start + (end - start) * easingsFunctions[easing](amount)) as T;
  else throw new Error(`Cannot lerp: ${start} and ${end}`);
};
