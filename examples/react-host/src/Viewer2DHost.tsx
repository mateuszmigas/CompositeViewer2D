import React from "react";
import {
  generateRandomRectangles,
  generateRandomRobots,
  generateRobot,
} from "./helpers";
import { createCanvasChild, createDivChild } from "./helpers/dom";
import { Canvas2DRenderer } from "./renderers/Canvas2DRenderer";
import { HtmlRenderer } from "./renderers/HtmlRenderer";
import { PixijsRendererRenderer } from "./renderers/PixijsRenderer";
import { ThreeJsRendererer } from "./renderers/ThreejsRenderer";
import {
  RenderDispatcher,
  Viewport,
  ViewportManipulator,
  RendererControllerFactory,
  PerformanceMonitorPanel,
} from "./viewer2d";

const createCanvasWorker = (name: string) =>
  new Worker("./renderers/renderWorker.template.ts", {
    type: "module",
    name: `${name}.renderer`,
  });

type SuperViewerRenderers = {
  threejs: ThreeJsRendererer;
  pixijs: PixijsRendererRenderer;
  canvas2d: Canvas2DRenderer;
  html: HtmlRenderer;
};

//type SuperViewerPatches = Patchers<SuperViewerRenderers>;

export class Viewer2DHost extends React.PureComponent<{}, {}> {
  hostElement: React.RefObject<HTMLDivElement>;
  renderDispatcher!: RenderDispatcher<SuperViewerRenderers>;
  viewportManipulator!: ViewportManipulator;

  constructor(props: {}) {
    super(props);
    this.hostElement = React.createRef();
    this.state = {};
  }

  componentDidMount() {
    if (this.hostElement.current === null) return;

    //disable context menu
    this.hostElement.current.oncontextmenu = () => false;

    const initialViewport = {
      position: { x: 0, y: 0 },
      zoom: 1,
    };

    this.viewportManipulator = new ViewportManipulator(
      this.hostElement.current,
      initialViewport,
      (newViewport: Viewport) => this.renderDispatcher.setViewport(newViewport)
    );

    //debug only
    const perfMonitorPanel = new PerformanceMonitorPanel();
    this.hostElement.current.appendChild(perfMonitorPanel.getElement());

    const factory = new RendererControllerFactory(
      {
        renderMode: "onDemand",
        profiling: {
          onRendererStatsUpdated: perfMonitorPanel.updateStats,
        },
      },
      createCanvasWorker
    );

    const rendererControllers = {
      pixijs: factory.create(
        PixijsRendererRenderer,
        [createDivChild(this.hostElement.current, 203)],
        true
      ),
      html: factory.create(
        HtmlRenderer,
        [createDivChild(this.hostElement.current, 204)],
        true
      ),
      canvas2d: factory.createOffscreenIfAvailable(
        Canvas2DRenderer,
        [createCanvasChild(this.hostElement.current, 202)],
        true
      ),
      // threejs: factory.createOffscreenIfAvailable(
      //   ThreeJsRendererer,
      //   [createCanvasChild(this.hostElement.current, 100)],
      //   true
      // ),
      threejs: factory.createOrchestratedOffscreenIfAvailable(
        ThreeJsRendererer,
        [],
        index =>
          createCanvasChild(this.hostElement.current as any, 100 + index),
        {
          balancedFields: ["rectangles"],
          // frameTimeTresholds: {
          //   tooSlow: 16,
          //   tooFast: 5
          // },
          //initialExecutors:
          minExecutors: 1,
          maxExecutors: 4,
          frequency: 4000,
        },
        true
      ),
    };
    perfMonitorPanel.addRenderers(rendererControllers);

    this.renderDispatcher = new RenderDispatcher<SuperViewerRenderers>(
      this.hostElement.current,
      rendererControllers,
      this.fullRender
    );

    this.renderDispatcher.setViewport(initialViewport);
  }

  private fullRender = () => {
    // const rectangles = generateRandomRectangles(10);
    // const texts = rectangles.map((r, index) => ({
    //   ...r,
    //   text: `Shape:${index}`,
    // }));
    const { rectangles, ellipses, texts } = generateRandomRobots(100);
    this.renderDispatcher.render({
      canvas2d: {
        borders: rectangles,
      },
      threejs: {
        rectangles,
      },
      pixijs: {
        ellipses,
      },
      html: {
        texts,
      },
    });
  };

  componentWillUnmount() {
    this.renderDispatcher.dispose();
  }

  render() {
    return (
      <div className="viewer-content">
        <div
          className="viewer-content"
          // onClick={() => {
          //   console.log("clicked");
          //   this.renderDispatcher
          //     .pickObjects({
          //       mode: "position",
          //       position: { x: 100, y: 100 },
          //     })
          //     .then(result => console.log(result))
          //     .catch(error => console.error(error));
          // }}
          onClick={() => {
            console.log("clicked");

            // const newRectangles = generateRandomRectangles(0);
            // this.renderDispatcher.renderPatches({
            //   canvas2d2: [
            //     {
            //       path: "rectangles",
            //       op: "add",
            //       values: [],
            //     },
            //   ],
            //   threejs: [
            //     {
            //       path: "rectangles",
            //       op: "add",
            //     },
            //       values: newRectangles,
            //   ],
            //      // });
          }}
          tabIndex={0}
          ref={this.hostElement}
        ></div>
      </div>
    );
  }
}
