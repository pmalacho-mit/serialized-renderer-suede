import * as PIXI from "@pixi/webworker";
import { type Parent, point, apply2DTransform, rootParent } from ".";
import type {
  AnchoredPosition,
  LinePoint,
  PixiByRendererInput,
  PropertiesByRendererInput,
  RelativeLength,
  RelativeRadius,
  Shape,
} from "..";
import type { Scope } from "../scope";
import { upper } from "../utils";

const extractRadius = (x: RelativeRadius | RelativeRadius["radius"]) => {
  if ("radius" in x) return extractRadius(x.radius);
  else if ("width" in x) return { value: x.width, dimension: "width" } as const;
  else if ("height" in x)
    return { value: x.height, dimension: "height" } as const;
  throw new Error("Invalid radius specification");
};

const resolveLength = (relative: RelativeLength, parent: Parent) =>
  "width" in relative
    ? parent.width * relative.width
    : parent.height * relative.height;

const linePositionToAnchored = (
  position: LinePoint[keyof LinePoint]
): AnchoredPosition => ({
  value: position.value,
  anchors: {
    self: 0.5,
    parent: position.parent,
  },
});

const applyTransformToLinePoint = (
  target: Record<"x" | "y", number>,
  { x, y }: LinePoint,
  parent: Parent,
  useParentRotation: boolean
) =>
  apply2DTransform(
    target,
    linePositionToAnchored(x),
    linePositionToAnchored(y),
    0,
    0,
    parent,
    useParentRotation
  );

const shape = (
  graphic: PixiByRendererInput["graphics"],
  config: Shape,
  parent: Parent,
  useParentRotation: boolean
) => {
  switch (config.kind) {
    case "circle": {
      const { x, y, color } = config;
      const radius = resolveLength(config.radius, parent);
      const width = 2 * radius;
      const height = 2 * radius;
      apply2DTransform(graphic, x, y, width, height, parent, useParentRotation);
      graphic.beginFill(color);
      graphic.drawCircle(0, 0, radius);
      graphic.endFill();
      break;
    }
    case "rectangle": {
      const { x, y, color } = config;
      const width = config.width * parent.width;
      const height = config.height * parent.height;
      apply2DTransform(graphic, x, y, width, height, parent, useParentRotation);
      graphic.beginFill(color);
      graphic.drawRect(-width / 2, -height / 2, width, height);
      graphic.endFill();
      break;
    }
    case "rounded rectangle": {
      const { x, y, color } = config;
      const radius = resolveLength(config.radius, parent);
      const width = config.width * parent.width;
      const height = config.height * parent.height;
      apply2DTransform(graphic, x, y, width, height, parent, useParentRotation);
      graphic.beginFill(color);
      graphic.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
      graphic.endFill();
      break;
    }
    case "line": {
      const { thickness, points, color } = config;
      const width = resolveLength(thickness, parent);
      const cap = PIXI.LINE_CAP[upper(config.cap ?? "butt")];

      graphic.lineStyle({ width, color, cap });

      const firstPoint = points[0];
      applyTransformToLinePoint(graphic, firstPoint, parent, useParentRotation);
      graphic.moveTo(0, 0);

      for (let i = 1; i < points.length; i++) {
        const point = points[i];
        const resolved = { x: 0, y: 0 };
        applyTransformToLinePoint(resolved, point, parent, useParentRotation);
        const x = resolved.x - graphic.x;
        const y = resolved.y - graphic.y;
        graphic.lineTo(x, y);
        graphic.moveTo(x, y);
      }
      break;
    }
    case "ellipse": {
      const { x, y, color } = config;
      const width = config.width * parent.width;
      const height = config.height * parent.height;
      apply2DTransform(graphic, x, y, width, height, parent, useParentRotation);
      graphic.beginFill(color);
      graphic.drawEllipse(0, 0, width / 2, height / 2);
      graphic.endFill();
      break;
    }
  }
};

export const draw = (
  graphic: PixiByRendererInput["graphics"],
  scope: Scope,
  config?: PropertiesByRendererInput["graphics"],
  parent?: Parent
) => {
  const {
    lookup: { graphics: lookup },
    parentByChild,
  } = scope;

  config ??= lookup.configBy.get(graphic)!;
  parent ??= parentByChild.get(graphic) ?? rootParent(scope);

  graphic.clear();
  shape(graphic, config, parent, config.useParentRotation ?? false);

  graphic.zIndex = config.zIndex ?? 0;
  if (config.mask) graphic.mask = lookup.byIdentifier.get(config.mask)!;
  if (config.rotation !== undefined)
    graphic.rotation = config.rotation * 2 * Math.PI;
  if (config.alpha !== undefined) graphic.alpha = config.alpha;
};
