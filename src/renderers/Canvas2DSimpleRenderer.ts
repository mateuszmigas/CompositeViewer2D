import { hasPropertyInChain } from "../common/typeGuards";
import { Renderer } from "../types/common";
import { Size, Rectangle } from "../types/geometry";
import { RenderRectangleObject, RenderCircleObject } from "../types/renderItem";
import { Viewport } from "../types/viewport";
import {
  InstantRenderSyncContext,
  IRenderSyncContext,
} from "./RenderSyncContext";

//sheetSize
//scene2d, worldSize:x,y, viewSize, viewport { zoom, offset }
//scene3d, worldSize:x,y,z viewSize, camera: any
//SceneRenderer2D
//SceneRenderer3D

//viewport { size, zoom, offset } View2D View3S
//viewerCanvas 3000x2000\

export class Canvas2DSimpleRenderer implements Renderer {
  private canvasContext:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  private canvasSize: Size = { width: 0, height: 0 };
  private viewport: Viewport = { position: { x: 0, y: 0 }, zoom: 1 };
  animationFrameHandle = 0;

  constructor(
    private canvas: HTMLCanvasElement | OffscreenCanvas,
    private synchronizationContext: IRenderSyncContext = new InstantRenderSyncContext()
  ) {
    const context = canvas.getContext("2d");

    if (context === null) throw Error("context is null");

    this.canvasContext = context;
    this.canvasContext.globalCompositeOperation = "destination-over"; //todo check performance

    synchronizationContext.register(() => this.renderInt());
  }

  setVisibility(visible: boolean) {
    if (hasPropertyInChain(this.canvas, "style"))
      this.canvas.style.visibility = visible ? "visible" : "collapse";
    else throw new Error("Cannot change visibility, no style");
  }

  //todo canvas left
  setSize(size: Rectangle): void {
    const canvas = this.getCanvas();
    canvas.width = size.width;
    canvas.height = size.height;
    this.canvasSize = { width: size.width, height: size.height };
    this.synchronizationContext.scheduleRender();
  }

  setViewport(viewport: Viewport) {
    this.viewport = { ...viewport };
    this.synchronizationContext.scheduleRender();
  }

  payload: any;

  render(
    time: number,
    renderPayload: {
      rectangles?: RenderRectangleObject[];
      circles?: RenderCircleObject[];
    }
  ): void {
    this.payload = renderPayload;
    this.renderInt();
  }

  renderInt(): void {
    this.clearCanvas();

    if (!this.payload) return;

    const zoom = this.viewport.zoom;
    const { x: xOffset, y: yOffset } = this.viewport.position;

    if (this.payload.rectangles) {
      this.payload.rectangles.forEach((rectangle: any) => {
        this.canvasContext.fillStyle = `rgb(
            ${rectangle.color.r},
            ${rectangle.color.g},
            ${rectangle.color.b})`;
        this.canvasContext.fillRect(
          ~~(xOffset + rectangle.x * zoom),
          ~~(yOffset + rectangle.y * zoom),
          ~~(rectangle.width * zoom),
          ~~(rectangle.height * zoom)
        );
      });
    }

    if (this.payload.circles) {
      //todo
      this.canvasContext.beginPath();
      this.payload.circles.forEach((circle: any) => {
        const x = ~~(xOffset + circle.x * zoom);
        const y = ~~(yOffset + circle.y * zoom);
        this.canvasContext.moveTo(x, y);
        this.canvasContext.arc(x, y, 10, 0, Math.PI * 2);
      });
      this.canvasContext.fillStyle = "black";
      this.canvasContext.fill();
    }
  }

  dispose(): void {}

  private clearCanvas() {
    this.canvasContext.clearRect(
      0,
      0,
      this.canvasSize.width,
      this.canvasSize.height
    );
  }

  private getCanvas() {
    return this.canvasContext.canvas;
  }
}
