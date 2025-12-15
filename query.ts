import * as PIXI from "@pixi/webworker";
import type { PixiByRendererInput } from "./";
import type { Scope } from "./scope";

type SceneItem = PIXI.Sprite | PIXI.Container | PIXI.Graphics;

const isSceneItem = (
  item: any
): item is PixiByRendererInput[keyof PixiByRendererInput] => {
  return (
    item instanceof PIXI.Sprite ||
    item instanceof PIXI.Container ||
    item instanceof PIXI.Graphics
  );
};

function findTopmostObjectAtPosition(root: SceneItem, x: number, y: number) {
  let topmostObject: SceneItem | null = null;

  // Recursive function to traverse the scene graph
  function traverse(container: SceneItem, x: number, y: number) {
    // Iterate backwards to start checking from the topmost (last rendered) object
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i];

      // Calculate the bounds of the child
      const bounds = child.getBounds();

      // Check if the click is within the bounds of the child
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        // If the child is a container itself, dive deeper
        if (isSceneItem(child) && child.children && child.children.length > 0) {
          traverse(child, x, y);
        }

        // Update the topmost object if this child is the topmost one so far
        if (!topmostObject || child.zIndex > topmostObject.zIndex) {
          topmostObject = child as SceneItem;
        }

        // Since we've found a child under the point, break the loop
        return;
      }
    }
  }

  traverse(root, x, y);

  return topmostObject;
}

export const getHit = (scope: Scope, x: number, y: number) => {
  if (scope.flipped) x = scope.app.view.width - x;
  // loop over scop children
  const candidate = findTopmostObjectAtPosition(scope.container, x, y);
  if (!candidate) return postMessage(null);
  const result = candidate as SceneItem;
  if (result instanceof PIXI.Sprite) {
    const config = scope.lookup.sprites.configBy.get(result);
    (config as any)["identifier"] =
      scope.lookup.sprites.identifierBy.get(result);
    postMessage(config);
  } else if (result instanceof PIXI.Graphics) {
    const config = scope.lookup.graphics.configBy.get(result);
    (config as any)["identifier"] =
      scope.lookup.graphics.identifierBy.get(result);
    postMessage(config);
  }
};
