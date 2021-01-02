import Vector from './core/Vector';
import Scene from './core/Scene';
import Layer from './core/Layer';
import RectNode from './nodes/RectNode';
import CircleNode from './nodes/CircleNode';
import ImageNode from './nodes/ImageNode';
import SpriteNode from './nodes/SpriteNode';
import TextNode from './nodes/TextNode';
import {
  CircleNodeConfig,
  ImageNodeConfig,
  SpriteNodeConfig,
  TextNodeConfig,
  NodeConfig,
  NodesType,
  NodesTypeName,
} from './types';
import View from './core/View';
import Event from './core/Event';

export default class Engine {
  size: Vector;

  canvasOffset: Vector;

  running: boolean;

  stopped: boolean;

  activeScene: Scene;

  layers: { [key: string]: Layer };

  private scenes: { [key: string]: Scene };

  event: Event;

  vector: (x?: number, y?: number) => Vector;

  container: HTMLElement;

  constructor(_box: string | HTMLElement, layersArray?: string[]) {
    this.size = null;
    this.canvasOffset = null;
    this.activeScene = null;
    this.running = false;
    this.stopped = true;

    this.layers = {};
    this.scenes = {};
    this.event = null;

    this.vector = (x?: number, y?: number) => new Vector(x, y);

    this.init(_box, layersArray);
  }

  public on(node: NodesType, event: string, callback: (e: any) => void) {
    this.event.handle(node, event, callback);
  }

  // Init
  public init(_box: string | HTMLElement, layersArray?: string[]) {
    this.container = typeof _box === 'string' ? document.getElementById(_box) : _box;

    const box: DOMRect = this.container.getBoundingClientRect();

    this.canvasOffset = this.vector(box.left, box.top);
    this.size = this.vector(box.width, box.height);

    this.event = new Event(this.canvasOffset);

    if (layersArray && layersArray.length > 0) {
      layersArray.forEach((layer, i) => {
        this.createLayer(layer, i);
      });
    } else {
      this.createLayer('main', 0);
    }
  }

  //   Engine
  public start(name: string) {
    if (this.running || !this.stopped) return;
    this.running = this.setScene(name);
    this.stopped = !this.running;
    if (this.running) {
      this.updateScene();
    }
  }

  public stop() {
    if (this.stopped && !this.running) return;
    this.stopped = true;
    this.running = false;
  }

  private updateScene() {
    this.activeScene.clear();
    this.activeScene.updateNodes();
    this.activeScene.update();
    this.activeScene.drawNodes();
    this.activeScene.draw();
    if (this.running) {
      requestAnimationFrame(this.updateScene.bind(this));
    }
  }

  // Layers
  public createLayer(name: string, index?: number) {
    if (this.layers[name]) return;
    const idx = index && index !== 0 ? index : Object.keys(this.layers).length;
    this.layers[name] = new Layer(idx as number, this.size, this.container, this.canvasOffset);
  }

  public getLayer(name: string) {
    return this.layers[name];
  }

  //   Scenes
  public createScene(name: string, Construct?: any) {
    if (this.scenes[name]) return;
    this.scenes[name] = new Scene(Construct ? new Construct() : {});
  }

  public setScene(name: string) {
    if (!name || !this.scenes[name]) return false;

    if (this.activeScene) {
      this.activeScene.exit();
    }

    this.activeScene = this.scenes[name];
    this.activeScene.init();
    return true;
  }

  //   Nodes
  private static createNodeType(params: NodeConfig, update?: (node: NodesType) => void) {
    const type: NodesTypeName = params.type;

    switch (type) {
      case 'RectNode': {
        return new RectNode(params, update);
      }
      case 'CircleNode': {
        return new CircleNode(params as CircleNodeConfig, update);
      }
      case 'TextNode': {
        return new TextNode(params as TextNodeConfig, update);
      }
      case 'ImageNode': {
        return new ImageNode(params as ImageNodeConfig, update);
      }
      case 'SpriteNode': {
        return new SpriteNode(params as SpriteNodeConfig, update);
      }

      default:
        break;
    }
    return null;
  }

  public createNode(params: any, update?: (node: NodesType) => void) {
    const layer = this.layers[params.layer];
    const config: NodeConfig = { ...params, layer };
    const node = Engine.createNodeType(config, update) as NodesType;

    if (!node) return null;

    layer.nodes.push(node);

    node.draw();

    node.addTo = (sceneName: string) => {
      if (!sceneName) return;
      if (node.sceneName) {
        const sceneNodes = this.scenes[node.sceneName].scene.nodes;
        const sceneIdx = sceneNodes.indexOf(node);
        if (sceneIdx !== -1) {
          sceneNodes.splice(sceneIdx, 1);
        }
      }
      node.sceneName = sceneName;
      const curScene = this.scenes[sceneName];
      if (!curScene) return;
      curScene.scene.nodes.push(node);
      return node;
    };

    node.destroy = () => {
      const sceneNodes = this.scenes[node.sceneName].scene.nodes;
      const sceneIdx = sceneNodes.indexOf(node);
      const layerIdx = node.layer.nodes.indexOf(node);
      if (sceneIdx !== -1) {
        sceneNodes.splice(sceneIdx, 1);
      }
      if (layerIdx !== -1) {
        node.layer.nodes.splice(layerIdx, 1);
      }
    };

    return node;
  }

  //   View
  public addView(layers: Layer[]) {
    return new View(layers);
  }
}
