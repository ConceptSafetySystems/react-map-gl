import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import WebMercatorViewport, { normalizeViewportProps } from 'viewport-mercator-project';
import { TransitionInterpolator } from './transition';
import { clamp } from './math-utils';
import assert from './assert';
export const MAPBOX_LIMITS = {
  minZoom: 0,
  maxZoom: 24,
  minPitch: 0,
  maxPitch: 60
};
const DEFAULT_STATE = {
  pitch: 0,
  bearing: 0,
  altitude: 1.5
};
export default class MapState {
  constructor(_ref) {
    let {
      width,
      height,
      latitude,
      longitude,
      zoom,
      bearing = DEFAULT_STATE.bearing,
      pitch = DEFAULT_STATE.pitch,
      altitude = DEFAULT_STATE.altitude,
      maxZoom = MAPBOX_LIMITS.maxZoom,
      minZoom = MAPBOX_LIMITS.minZoom,
      maxPitch = MAPBOX_LIMITS.maxPitch,
      minPitch = MAPBOX_LIMITS.minPitch,
      transitionDuration,
      transitionEasing,
      transitionInterpolator,
      transitionInterruption,
      startPanLngLat,
      startZoomLngLat,
      startBearing,
      startPitch,
      startZoom
    } = _ref;

    _defineProperty(this, "_viewportProps", void 0);

    _defineProperty(this, "_interactiveState", void 0);

    assert(Number.isFinite(width), '`width` must be supplied');
    assert(Number.isFinite(height), '`height` must be supplied');
    assert(Number.isFinite(longitude), '`longitude` must be supplied');
    assert(Number.isFinite(latitude), '`latitude` must be supplied');
    assert(Number.isFinite(zoom), '`zoom` must be supplied');
    this._viewportProps = this._applyConstraints({
      width,
      height,
      latitude,
      longitude,
      zoom,
      bearing,
      pitch,
      altitude,
      maxZoom,
      minZoom,
      maxPitch,
      minPitch,
      transitionDuration,
      transitionEasing,
      transitionInterpolator,
      transitionInterruption
    });
    this._interactiveState = {
      startPanLngLat,
      startZoomLngLat,
      startBearing,
      startPitch,
      startZoom
    };
  }

  getViewportProps() {
    return this._viewportProps;
  }

  getInteractiveState() {
    return this._interactiveState;
  }

  panStart(_ref2) {
    let {
      pos
    } = _ref2;
    return this._getUpdatedMapState({
      startPanLngLat: this._unproject(pos)
    });
  }

  pan(_ref3) {
    let {
      pos,
      startPos
    } = _ref3;

    const startPanLngLat = this._interactiveState.startPanLngLat || this._unproject(startPos);

    if (!startPanLngLat) {
      return this;
    }

    const [longitude, latitude] = this._calculateNewLngLat({
      startPanLngLat,
      pos
    });

    return this._getUpdatedMapState({
      longitude,
      latitude
    });
  }

  panEnd() {
    return this._getUpdatedMapState({
      startPanLngLat: null
    });
  }

  rotateStart(_ref4) {
    let {
      pos
    } = _ref4;
    return this._getUpdatedMapState({
      startBearing: this._viewportProps.bearing,
      startPitch: this._viewportProps.pitch
    });
  }

  rotate(_ref5) {
    let {
      deltaScaleX = 0,
      deltaScaleY = 0
    } = _ref5;
    const {
      startBearing,
      startPitch
    } = this._interactiveState;

    if (!Number.isFinite(startBearing) || !Number.isFinite(startPitch)) {
      return this;
    }

    const {
      pitch,
      bearing
    } = this._calculateNewPitchAndBearing({
      deltaScaleX,
      deltaScaleY,
      startBearing: startBearing || 0,
      startPitch: startPitch || 0
    });

    return this._getUpdatedMapState({
      bearing,
      pitch
    });
  }

  rotateEnd() {
    return this._getUpdatedMapState({
      startBearing: null,
      startPitch: null
    });
  }

  zoomStart(_ref6) {
    let {
      pos
    } = _ref6;
    return this._getUpdatedMapState({
      startZoomLngLat: this._unproject(pos),
      startZoom: this._viewportProps.zoom
    });
  }

  zoom(_ref7) {
    let {
      pos,
      startPos,
      scale
    } = _ref7;
    assert(scale > 0, '`scale` must be a positive number');
    let {
      startZoom,
      startZoomLngLat
    } = this._interactiveState;

    if (!Number.isFinite(startZoom)) {
      startZoom = this._viewportProps.zoom;
      startZoomLngLat = this._unproject(startPos) || this._unproject(pos);
    }

    assert(startZoomLngLat, '`startZoomLngLat` prop is required ' + 'for zoom behavior to calculate where to position the map.');

    const zoom = this._calculateNewZoom({
      scale,
      startZoom: startZoom || 0
    });

    const zoomedViewport = new WebMercatorViewport(Object.assign({}, this._viewportProps, {
      zoom
    }));
    const [longitude, latitude] = zoomedViewport.getMapCenterByLngLatPosition({
      lngLat: startZoomLngLat,
      pos
    });
    return this._getUpdatedMapState({
      zoom,
      longitude,
      latitude
    });
  }

  zoomEnd() {
    return this._getUpdatedMapState({
      startZoomLngLat: null,
      startZoom: null
    });
  }

  _getUpdatedMapState(newProps) {
    return new MapState(Object.assign({}, this._viewportProps, this._interactiveState, newProps));
  }

  _applyConstraints(props) {
    const {
      maxZoom,
      minZoom,
      zoom
    } = props;
    props.zoom = clamp(zoom, minZoom, maxZoom);
    const {
      maxPitch,
      minPitch,
      pitch
    } = props;
    props.pitch = clamp(pitch, minPitch, maxPitch);
    Object.assign(props, normalizeViewportProps(props));
    return props;
  }

  _unproject(pos) {
    const viewport = new WebMercatorViewport(this._viewportProps);
    return pos && viewport.unproject(pos);
  }

  _calculateNewLngLat(_ref8) {
    let {
      startPanLngLat,
      pos
    } = _ref8;
    const viewport = new WebMercatorViewport(this._viewportProps);
    return viewport.getMapCenterByLngLatPosition({
      lngLat: startPanLngLat,
      pos
    });
  }

  _calculateNewZoom(_ref9) {
    let {
      scale,
      startZoom
    } = _ref9;
    const {
      maxZoom,
      minZoom
    } = this._viewportProps;
    const zoom = startZoom + Math.log2(scale);
    return clamp(zoom, minZoom, maxZoom);
  }

  _calculateNewPitchAndBearing(_ref10) {
    let {
      deltaScaleX,
      deltaScaleY,
      startBearing,
      startPitch
    } = _ref10;
    deltaScaleY = clamp(deltaScaleY, -1, 1);
    const {
      minPitch,
      maxPitch
    } = this._viewportProps;
    const bearing = startBearing + 180 * deltaScaleX;
    let pitch = startPitch;

    if (deltaScaleY > 0) {
      pitch = startPitch + deltaScaleY * (maxPitch - startPitch);
    } else if (deltaScaleY < 0) {
      pitch = startPitch - deltaScaleY * (minPitch - startPitch);
    }

    return {
      pitch,
      bearing
    };
  }

}
//# sourceMappingURL=map-state.js.map