/* Stub do MapLibre GL JS para a suíte (sem WebGL, sem tiles, sem rede).
   Implementa só o que js/mapa-celulas.js usa. O pino é o próprio elemento do app
   (<div class="mapa-celulas-pino" data-lat data-lng data-sexo>), anexado ao container.
   O container do mapa expõe data-estilo, data-centro ("lat,lng"), data-zoom e, após
   fitBounds, data-enquadre ("minLat,minLng,maxLat,maxLng").
   window.__mapasCriados conta quantos `new Map` aconteceram. */
(function () {
  if (window.maplibregl && window.maplibregl.__stub) return;
  window.__mapasCriados = 0;

  function emissor(obj) {
    obj._ev = {};
    obj.on = function (t, f) { (obj._ev[t] = obj._ev[t] || []).push(f); return obj; };
    obj.off = function (t, f) { obj._ev[t] = (obj._ev[t] || []).filter(x => x !== f); return obj; };
    obj.once = function (t, f) {
      const w = function (e) { obj.off(t, w); f(e); };
      return obj.on(t, w);
    };
    obj.fire = function (t, e) { (obj._ev[t] || []).slice().forEach(f => f(e || { type: t })); return obj; };
  }

  class Map {
    constructor(opts) {
      emissor(this);
      window.__mapasCriados++;
      this.options = opts;
      this._container = typeof opts.container === 'string' ? document.getElementById(opts.container) : opts.container;
      this._container.classList.add('maplibregl-map', 'mapa-stub');
      this._container.style.position = 'relative';
      this._marcadores = 0;
      this.setStyle(opts.style);
      this.jumpTo({ center: opts.center, zoom: opts.zoom });
      setTimeout(() => this.fire('load'), 0);
    }
    setStyle(url) { this.estilo = url; this._container.dataset.estilo = url; return this; }
    jumpTo(o) {
      if (o.center) this._center = { lng: o.center[0], lat: o.center[1] };
      if (o.zoom !== undefined) this._zoom = o.zoom;
      this._container.dataset.centro = `${this._center.lat},${this._center.lng}`;
      this._container.dataset.zoom = String(this._zoom);
      return this;
    }
    // Enquadre: centro no meio da caixa; data-enquadre = "minLat,minLng,maxLat,maxLng"
    fitBounds(b, o) {
      const [[minLng, minLat], [maxLng, maxLat]] = b;
      this.enquadres = (this.enquadres || 0) + 1;
      this._container.dataset.enquadre = `${minLat},${minLng},${maxLat},${maxLng}`;
      this.jumpTo({ center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], zoom: (o && o.maxZoom) || 14 });
      this.fire('moveend');
      return this;
    }
    getBounds() { return { contains: () => true }; }
    getCenter() { return { ...this._center }; }
    getZoom() { return this._zoom; }
    addControl() { return this; }
    resize() { this.resizes = (this.resizes || 0) + 1; return this; }
    getContainer() { return this._container; }
    remove() { this._container.innerHTML = ''; this.removido = true; }
  }

  class Marker {
    constructor(opts) { this._el = opts.element; this._offset = [0, 0]; }
    setLngLat(ll) { this._lngLat = { lng: ll[0], lat: ll[1] }; return this; }
    getLngLat() { return this._lngLat; }
    setOffset(o) { this._offset = o; return this; }
    getElement() { return this._el; }
    addTo(map) {
      const n = map._marcadores++;
      this._el.style.position = 'absolute';
      this._el.style.left = `${10 + (n % 12) * 24}px`;
      this._el.style.top = `${40 + Math.floor(n / 12) * 24}px`;
      map._container.appendChild(this._el);
      return this;
    }
    remove() { this._el.remove(); return this; }
  }

  class Popup {
    constructor(opts) {
      emissor(this);
      this.options = opts || {};
      this._el = document.createElement('div');
      this._el.className = `maplibregl-popup ${this.options.className || ''}`;
      Object.assign(this._el.style, { position: 'absolute', top: '8px', right: '8px', zIndex: '5', background: '#fff', color: '#000' });
    }
    setLngLat(ll) { this._lngLat = ll; return this; }
    setDOMContent(node) {
      this._el.innerHTML = '';
      const c = document.createElement('div');
      c.className = 'maplibregl-popup-content';
      c.appendChild(node);
      this._el.appendChild(c);
      return this;
    }
    addTo(map) { map._container.appendChild(this._el); this._aberto = true; return this; }
    isOpen() { return !!this._aberto; }
    remove() {
      if (!this._aberto) return this;
      this._aberto = false;
      this._el.remove();
      this.fire('close');
      return this;
    }
  }

  class NavigationControl {}

  window.maplibregl = { __stub: true, Map, Marker, Popup, NavigationControl };
})();
