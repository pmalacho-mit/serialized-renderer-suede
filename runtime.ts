import * as PIXI from "@pixi/webworker";
import type {
  AliasLookup,
  GenericTransition,
  PixiObject,
  RenderInput,
  Spritesheet,
} from "./";
import {
  perform as performTransitions,
  configure as configureTransitions,
} from "./transitions";
import {
  configure as configureVisuals,
  type ParentVisual,
  type Visual,
} from "./visuals";
import { configure as configureFilters } from "./filters";
// import pageMask1 from './masks/masks/mask2_3.png';
// import pageMask2 from './masks/masks/mask2_4.png';
// import pageMask3 from './masks/masks/mask2_5.png';
import pageMask1Inverted from "./masks/masks/mask2_3Inverted.png";
import pageMask2Inverted from "./masks/masks/mask2_4Inverted.png";
import pageMask3Inverted from "./masks/masks/mask2_5Inverted.png";
// import pageCorner1 from './masks/corners/page2_3.png';
// import pageCorner2 from './masks/corners/page2_4.png';
// import pageCorner3 from './masks/corners/page2_5.png';
import pageCorner1 from "./masks/corners5/page3_21.png";
import pageCorner2 from "./masks/corners5/page3_31.png";
import pageCorner3 from "./masks/corners5/page3_41.png";
import pageCorner4 from "./masks/corners5/page3_51.png";
import pageCorner5 from "./masks/corners5/page3_61.png";
import pageCorner6 from "./masks/corners5/page3_71.png";
import pageCorner7 from "./masks/corners5/page3_81.png";
import pageCorner8 from "./masks/corners5/page3_91.png";
import pageCorner9 from "./masks/corners5/page3_101.png";
import pageCorner10 from "./masks/corners5/page3_111.png";
import pageMask1 from "./masks/masks2/page3_2.png";
import pageMask2 from "./masks/masks2/page3_3.png";
import pageMask3 from "./masks/masks2/page3_4.png";
import pageMask4 from "./masks/masks2/page3_5.png";
import pageMask5 from "./masks/masks2/page3_6.png";
import pageMask6 from "./masks/masks2/page3_7.png";
import pageMask7 from "./masks/masks2/page3_8.png";
import pageMask8 from "./masks/masks2/page3_9.png";
import pageMask9 from "./masks/masks2/page3_10.png";
import pageMask10 from "./masks/masks2/page3_11.png";
import fullMask from "./masks/masks/full_mask.png";
import fullPage from "./masks/white_background.png";
import ovalMask from "./masks/frame2.png";
import stickers from "./masks/stickers.png";

export type Lookup<T, Key extends keyof RenderInput> = {
  byIdentifier: Map<string, T>;
  byTag: Map<string, T[]>;
  configBy: Map<T, PixiObject[Key]>;
  identifierBy: Map<T, string>;
};

const createLookup = <T, K extends keyof RenderInput>(): Lookup<T, K> => ({
  byIdentifier: new Map(),
  byTag: new Map(),
  configBy: new Map(),
  identifierBy: new Map(),
});

export type Scope = {
  app: PIXI.Application;
  container: PIXI.Container;
  assetPrefix?: string;
  lookup: {
    Sprite: Lookup<PIXI.Sprite, "Sprite">;
    Filter: Lookup<PIXI.Filter, "Filter">;
    Graphic: Lookup<PIXI.Graphics, "Graphic">;
    Transition: Lookup<GenericTransition, "Transition">;
  };
  childrenByParent: Map<ParentVisual, Visual[]>;
  parentByChild: Map<Visual, ParentVisual>;
  startTimeSeconds: number;
  elapsedTimeSeconds: number;
  alias: AliasLookup["Alias"];
  spritesheets?: Spritesheet[];
  texturesFromSheet?: Record<string, PIXI.Texture<PIXI.Resource>>;
  flipped?: boolean;
};

class InvertAlphaFilter extends PIXI.Filter {
  constructor() {
    // This fragment shader inverts the alpha channel
    const fragmentShader = `
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;

            void main(void) {
                vec4 color = texture2D(uSampler, vTextureCoord);
                color.a = 1.0 - color.a; // Invert the alpha value
                gl_FragColor = color;
            }
        `;

    super(undefined, fragmentShader);
  }
}

export const createScope = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
  assetPrefix?: string,
  pixelRatio?: number,
  spritesheets?: Spritesheet[],
  flipped?: boolean
) => {
  const scope: Scope = {
    container: new PIXI.Container(),
    app: new PIXI.Application({
      view: canvas as PIXI.ICanvas,
      backgroundAlpha: 0,
      backgroundColor: "#fff",
      width: canvas.width,
      height: canvas.height,
    }),
    lookup: {
      Sprite: createLookup(),
      Filter: createLookup(),
      Transition: createLookup(),
      Graphic: createLookup(),
    },
    childrenByParent: new Map(),
    parentByChild: new Map(),
    elapsedTimeSeconds: 0,
    startTimeSeconds: performance.now(),
    assetPrefix,
    alias: undefined as any as Scope["alias"],
    spritesheets,
    texturesFromSheet: undefined,
    flipped,
  };

  scope.app.stage.addChild(scope.container);
  scope.app.ticker.add(performTransitions.bind(null, scope));
  scope.app.stage.sortableChildren = true;

  return scope;
};

const clean = <T extends PIXI.Sprite | PIXI.Filter | PIXI.Graphics>(
  current: Record<string, any>,
  lookup: Lookup<T, keyof RenderInput>
) => {
  console.log("DESTROYING");
  if (!current) return;
  const set = new Set(Object.keys(current));
  for (const [identifier, item] of lookup.byIdentifier) {
    if (set.has(identifier)) continue;
    lookup.byIdentifier.delete(identifier);
    lookup.configBy.delete(item);
    item.destroy();
  }
  lookup.byTag.clear();
};

const getLocater =
  ({ assetPrefix }: Pick<Scope, "assetPrefix">) =>
  (id: string) =>
    (assetPrefix ?? "") + id;

type Input = RenderInput & AliasLookup;

export const load = async (
  scope: Scope,
  input: Input,
  locate?: ReturnType<typeof getLocater>
) => {
  console.log("scope");
  console.log(scope);
  locate ??= getLocater(scope);

  if (scope.spritesheets) {
    if (!scope.texturesFromSheet) {
      const sprites = Object.keys(input.Sprite);
      const textures = await Promise.all(
        Object.values(scope.spritesheets).map(async (sheet) => {
          const texture = PIXI.BaseTexture.from(locate(sheet.meta.image));
          const spritesheet = new PIXI.Spritesheet(texture, sheet);
          await spritesheet.parse();
          await Promise.all(
            sprites
              .map((_sprite) => spritesheet.textures[_sprite])
              .filter(Boolean)
              .map((_texture) => new Promise((r) => _texture.on("update", r)))
          );
          return spritesheet.textures;
        })
      );
      scope.texturesFromSheet = Object.assign({}, ...textures);
    }
    return scope.texturesFromSheet!;
  } else
    return PIXI.Assets.load<PIXI.Texture>(
      Object.keys(input.Sprite).map(locate)
    );
};

async function processTextures(
  path: any,
  scope: any,
  width: number,
  height: number
) {
  // Step 1: Load the textures
  const textures = await PIXI.Assets.load(path);

  async function adjustAlphaForTexture(texture: PIXI.Texture) {
    const sprite = new PIXI.Sprite(texture);
    const renderTexture = PIXI.RenderTexture.create({
      width: width,
      height: height,
    });
    const canvas = scope.app.renderer.plugins.extract.canvas(renderTexture);
    const context = canvas.getContext("2d");
    context.drawImage(
      (texture.baseTexture.resource as any).source,
      0,
      0,
      width,
      height
    );
    return PIXI.Texture.from(canvas);
  }

  return adjustAlphaForTexture(textures);
}

export const prepare = async (scope: Scope, input: Input) => {
  console.time("prepare");
  const { app, parentByChild, childrenByParent, lookup } = scope;
  app.stop();
  scope.alias = input.Alias;

  const fullPageTexture = await processTextures(
    fullPage,
    scope,
    scope.app.view.width,
    scope.app.view.height
  );

  if (scope.container.children.length > 0) {
    const lastChild =
      scope.container.children[scope.container.children.length - 1];
    if (lastChild.alpha == 0.35) {
      scope.container.removeChild(lastChild);
    }
  }
  if (scope.app.stage.children.length > 1) {
    scope.app.stage.removeChild(scope.app.stage.children[0]);
  }

  for (const child of scope.container.children) {
    if (child.name == "backgroundContainer") {
      scope.container.removeChild(child);
    }
  }

  (["Sprite", "Graphic", "Filter"] as const).forEach((key) =>
    clean(input[key], lookup[key] as any)
  );
  [
    ...Object.values(lookup.Transition),
    parentByChild,
    childrenByParent,
  ].forEach((map) => map.clear());

  const locate = getLocater(scope);

  const textures = await load(scope, input, locate);

  const fullPageSprite = new PIXI.Sprite(fullPageTexture);
  scope.app.stage.removeChild(scope.container);
  scope.app.stage.addChild(fullPageSprite);
  scope.app.stage.addChild(scope.container);

  configureVisuals(
    input,
    scope,
    (identifier) => {
      const sprite = PIXI.Sprite.from(
        textures[identifier] ?? textures[locate(identifier)]
      );
      sprite.anchor.set(0.5);
      return sprite;
    },
    () => new PIXI.Graphics()
  );

  configureFilters(input, scope);

  configureTransitions(input, scope);
  scope.container.sortableChildren = true;
  scope.container.sortChildren();

  // const fullPageSpriteOverlay = new PIXI.Sprite(fullPageTexture)
  // fullPageSpriteOverlay.alpha = 0.35;
  // fullPageSpriteOverlay.blendMode = PIXI.BLEND_MODES.OVERLAY;
  // fullPageSpriteOverlay.zIndex = 10000;
  // scope.container.addChild(fullPageSpriteOverlay);

  const backgroundSprites = scope.lookup.Sprite.byTag.get("background");
  console.log("BACKGROUND SPRITES", backgroundSprites);
  if (backgroundSprites) {
    for (const sprite of backgroundSprites) {
      console.log(sprite);
      console.log(sprite.x);
      console.log(sprite.y);
      let width = sprite.width;
      let height = sprite.height;
      if (width > scope.app.view.width - 100) {
        width = scope.app.view.width - 100;
      }
      if (height > scope.app.view.height) {
        height = scope.app.view.height;
      }

      scope.container.removeChild(sprite);

      const container = new PIXI.Container();
      container.zIndex = sprite.zIndex;
      container.name = "backgroundContainer";

      const vignetteTexture = await processTextures(
        ovalMask,
        scope,
        width,
        height
      );
      if (!vignetteTexture) {
        console.warn("Skipping sprite, no vignette texture.");
        continue;
      }

      const vignetteSprite = new PIXI.Sprite(vignetteTexture);
      // vignetteSprite.anchor = sprite.anchor;
      // vignetteSprite.x = sprite.x;
      // vignetteSprite.y = sprite.y;

      // Add mask first so it's in same container before assignment
      // container.addChild(vignetteSprite);
      container.addChild(sprite);
      // sprite.mask = vignetteSprite;

      scope.container.addChild(container);

      console.log(
        "ADDING CONTAINER",
        container.name,
        container.children.map((c) => c.name || c)
      );
    }
  }
  console.log("XXX");

  console.log(scope.container);
  // scope.container.mask = vignetteSprite;

  scope.elapsedTimeSeconds = 0;

  if (scope.flipped) {
    scope.container.pivot.x = scope.app.view.width;
    scope.container.scale.x = -1;
  }

  scope.startTimeSeconds = performance.now();
  scope.app.ticker.update();
  scope.app.stop();
  console.timeEnd("prepare");
};

export const animatePageFlip = async (scope: Scope, direction: string) => {
  const app = scope.app;

  let corners;
  if (direction == "backward") {
    corners = [
      pageCorner10,
      pageCorner9,
      pageCorner8,
      pageCorner7,
      pageCorner6,
      pageCorner5,
      pageCorner4,
      pageCorner3,
      pageCorner2,
      pageCorner1,
    ];
  } else {
    corners = [
      pageCorner1,
      pageCorner2,
      pageCorner3,
      pageCorner4,
      pageCorner5,
      pageCorner6,
      pageCorner7,
      pageCorner8,
      pageCorner9,
      pageCorner10,
    ];
  }

  let masks;
  if (direction == "backward") {
    masks = [
      pageMask10,
      pageMask9,
      pageMask8,
      pageMask7,
      pageMask6,
      pageMask5,
      pageMask4,
      pageMask3,
      pageMask2,
      pageMask1,
      fullMask,
    ];
  } else {
    masks = [
      pageMask1,
      pageMask2,
      pageMask3,
      pageMask4,
      pageMask5,
      pageMask6,
      pageMask7,
      pageMask8,
      pageMask9,
      pageMask10,
      fullMask,
    ];
  }

  const cornerTextures = await Promise.all(
    corners.map((path) => PIXI.Assets.load(path))
  );

  async function processTextures(paths: any[]) {
    const textures = await Promise.all(
      paths.map((path) => {
        return PIXI.Assets.load(path);
      })
    );

    function adjustAlphaForTexture(texture: PIXI.Texture) {
      const sprite = new PIXI.Sprite(texture);

      const renderTexture = PIXI.RenderTexture.create({
        width: sprite.width,
        height: sprite.height,
      });

      const graphics = new PIXI.Graphics();
      graphics.beginTextureFill({ texture: sprite.texture });
      graphics.drawRect(0, 0, sprite.width, sprite.height);
      graphics.endFill();

      app.renderer.render(graphics, { renderTexture });

      const canvas = app.renderer.plugins.extract.canvas(renderTexture);
      const context = canvas.getContext("2d");
      const imageData = context.getImageData(0, 0, sprite.width, sprite.height);
      const data = imageData.data;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          data[i] = 0;
        }
        if (direction == "backward") {
          data[i] = data[i] > 0 ? 0 : 255;
          data[i - 1] = 255;
          data[i - 2] = 255;
          data[i - 3] = 255;
        }
      }
      context.putImageData(imageData, 0, 0);
      return PIXI.Texture.from(canvas);
    }
    return textures.map(adjustAlphaForTexture);
  }

  const maskTextures = await processTextures(masks);
  const cornerSprites = cornerTextures.map(
    (texture) => new PIXI.Sprite(texture)
  );
  const maskSprites = maskTextures.map((texture) => new PIXI.Sprite(texture));

  const newContainer = new PIXI.Container();
  console.log("CHILDREN BEFORE ANIMATION");

  console.log(app.stage.children);
  console.log(scope.container);
  app.stage.children.forEach((child) => {
    newContainer.addChild(child);
    app.stage.removeChild(child);
  });
  app.stage.removeChild(scope.container);
  newContainer.addChild(scope.container);
  app.stage.addChild(newContainer);

  // Function to animate frames
  function animateFrames() {
    let currentFrame = 0;
    const totalFrames = 10; // Total number of frames to animate
    let frameCount = 0;
    let previousCornerSprite: PIXI.Sprite | null = null;
    let previousMaskSprite: PIXI.Sprite | null = null;

    function onFrame() {
      if (previousCornerSprite) {
        app.stage.removeChild(previousCornerSprite);
      }

      const maskSprite = maskSprites[currentFrame];
      const cornerSprite = cornerSprites[currentFrame];
      maskSprite.width = app.stage.width;
      maskSprite.height = app.stage.height;

      newContainer.mask = maskSprite;
      app.stage.addChild(cornerSprite);

      currentFrame = (currentFrame + 1) % corners.length;
      frameCount += 1;
      previousCornerSprite = cornerSprite;
      previousMaskSprite = maskSprite;

      if (frameCount >= totalFrames) {
        app.stage.mask = null;
        app.stage.removeChild(previousCornerSprite);
        newContainer.children.forEach((child) => {
          app.stage.addChild(child);
        });
        app.stage.addChild(scope.container);
        app.stage.removeChild(newContainer);
        console.log("CHILDREN AFTER ANIMATION");
        console.log(app.stage.children);
        postMessage("Page flip finished");
      } else {
        setTimeout(onFrame, 90);
      }
    }
    onFrame();
  }

  animateFrames();
  console.log("DONE ANIMATING");
};

export const inversePageFlip = async (scope: Scope, direction: string) => {
  const app = scope.app;

  console.log("CHILDREN");
  console.log(scope.app.stage.children);
  postMessage("Page flip finished");

  const fullPageTexture = await PIXI.Assets.load(fullPage);
  const vignetteTexture = PIXI.Texture.from(ovalMask); // Replace with your vignette image path
  const fullPageSpriteIncluded = scope.container.children.filter((child) => {
    return child instanceof PIXI.Sprite && child.texture === fullPageTexture;
  });
  const fullPageSpriteIncluded2 = scope.app.stage.children.filter((child) => {
    return child instanceof PIXI.Sprite && child.texture === fullPageTexture;
  });

  // if (fullPageSpriteIncluded.length > 0) {
  //     for (let i = 0; i < fullPageSpriteIncluded.length; i++) {
  //         scope.container.removeChild(fullPageSpriteIncluded[i]);
  //     }
  //     console.log("rmeoving");
  //     console.log(fullPageSpriteIncluded);
  // }

  // if (fullPageSpriteIncluded2.length > 0) {
  //     for (let i = 0; i < fullPageSpriteIncluded2.length; i++) {
  //         scope.app.stage.removeChild(fullPageSpriteIncluded2[i]);
  //     }
  //     console.log("rmeoving");
  //     console.log(fullPageSpriteIncluded);
  // }

  // let masks;
  // if (direction == "backward") {
  //     masks = [pageMask3Inverted, pageMask2Inverted, pageMask1Inverted, fullMask];
  // } else {
  //     masks = [pageMask1Inverted, pageMask2Inverted, pageMask3Inverted, fullMask];
  // }
  // // Load images and create textures
  // const maskTextures = await Promise.all(masks.map(path => PIXI.Assets.load(path)));

  // // Create sprites
  // const maskSprites = maskTextures.map(texture => new PIXI.Sprite(texture));

  // console.log("PREVIOUS MASL")

  // // Function to animate frames
  // function animateFrames() {
  //     let currentFrame = 0;
  //     const totalFrames = 4; // Total number of frames to animate
  //     let frameCount = 0;
  //     let previousMaskSprite: PIXI.Sprite | null = null;

  //     function onFrame() {
  //         // Clear the stage
  //         //app.stage.removeChildren();
  //         if (previousMaskSprite) {
  //             app.stage.removeChild(previousMaskSprite);
  //         }

  //         // Create and add the current mask and corner sprite
  //         const maskSprite = maskSprites[currentFrame];
  //         maskSprite.width = app.stage.width;
  //         maskSprite.height = app.stage.height;

  //         console.log("SECOND WIDTH");
  //         console.log(app.stage.width);

  //         // Set the mask for the corner sprite
  //         app.stage.mask = maskSprite;
  //         console.log(app.stage.mask);

  //         currentFrame = (currentFrame + 1);

  //         // Increment frame counter
  //         frameCount += 1;
  //         previousMaskSprite = maskSprite;

  //         // Stop the animation after the desired number of frames
  //         if (frameCount >= totalFrames) {
  //             app.stage.mask = null;
  //             postMessage("hmm");
  //         } else {
  //             // Wait 1 second before showing the next frame
  //             setTimeout(onFrame, 1000);
  //         }
  //     }

  //     // Start the animation loop
  //     onFrame();
  // }

  // // Start the animation
  // animateFrames();
  // console.log("DONE ANIMATING");
};

export const start = (scope: Scope) => {
  //debugger;
  scope.startTimeSeconds = performance.now();
  scope.app.start();
};

type SceneItem = PIXI.Sprite | PIXI.Container | PIXI.Graphics;
const isSceneItem = (item: any): item is SceneItem => {
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
    const config = scope.lookup.Sprite.configBy.get(result);
    (config as any)["identifier"] =
      scope.lookup.Sprite.identifierBy.get(result);
    postMessage(config);
  } else if (result instanceof PIXI.Graphics) {
    const config = scope.lookup.Graphic.configBy.get(result);
    (config as any)["identifier"] =
      scope.lookup.Graphic.identifierBy.get(result);
    postMessage(config);
  }
};
