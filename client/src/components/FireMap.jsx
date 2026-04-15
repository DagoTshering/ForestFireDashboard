import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import Overlay from 'ol/Overlay';
import GeoJSON from 'ol/format/GeoJSON';
import { BHUTAN_BOUNDS } from '../utils/constants';

const DZONGKHAG_DATA_URL = '/data/dzongkhags.geojson';

const defaultStyle = new Style({
  stroke: new Stroke({ color: '#3b82f6', width: 1.5 }),
  fill: new Fill({ color: 'rgba(59, 130, 246, 0.05)' }),
});

const highlightedStyle = new Style({
  stroke: new Stroke({ color: '#e94560', width: 3 }),
  fill: new Fill({ color: 'rgba(233, 69, 96, 0.15)' }),
});

const bhutanCenter = [
  (BHUTAN_BOUNDS.minLon + BHUTAN_BOUNDS.maxLon) / 2,
  (BHUTAN_BOUNDS.minLat + BHUTAN_BOUNDS.maxLat) / 2,
];

function FireMap({ fireData, selectedDzongkhag, onDzongkhagClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const popupRef = useRef(null);
  const [popupContent, setPopupContent] = useState(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const vectorSource = new VectorSource();
    const dzongkhagSource = new VectorSource();

    const vectorLayer = new VectorLayer({ source: vectorSource });
    const dzongkhagLayer = new VectorLayer({
      source: dzongkhagSource,
      style: defaultStyle,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        dzongkhagLayer,
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat(bhutanCenter),
        zoom: 8,
      }),
    });

    const popup = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-left',
      stopEvent: false,
    });
    map.addOverlay(popup);

    map.on('pointermove', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);

      if (feature && feature.get('fireData')) {
        const fire = feature.get('fireData');
        const confidence = fire.confidence || 50;
        const frp = fire.frp || 0;
        let intensity = 'Low';
        if (frp >= 60) intensity = 'Extreme';
        else if (frp >= 30) intensity = 'High';
        else if (frp >= 10) intensity = 'Moderate';

        setPopupContent({
          lat: fire.latitude.toFixed(4),
          lon: fire.longitude.toFixed(4),
          date: fire.acq_date,
          time: fire.acq_time,
          brightness: fire.brightness,
          frp: frp,
          confidence: confidence,
          intensity: intensity,
          satellite: fire.satellite,
          instrument: fire.instrument,
        });

        const coordinate = evt.coordinate;
        popup.setPosition(coordinate);
        popupRef.current.style.display = 'block';
      } else {
        popupRef.current.style.display = 'none';
      }
    });

    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => {
        if (f.get('DZONGKHA')) return f;
        return null;
      });

      if (feature) {
        const dzongkhagName = feature.get('DZONGKHA');
        if (onDzongkhagClick) {
          onDzongkhagClick(dzongkhagName);
        }
      }
    });

    mapInstanceRef.current = { map, vectorSource, vectorLayer, dzongkhagLayer, dzongkhagSource };

    fetch(DZONGKHAG_DATA_URL)
      .then(res => res.json())
      .then(data => {
        const parser = new GeoJSON();
        const features = parser.readFeatures(data, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        dzongkhagSource.addFeatures(features);
      })
      .catch(err => console.error('Failed to load dzongkhag data:', err));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.map.setTarget(null);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const { dzongkhagSource, map } = mapInstanceRef.current;
    const features = dzongkhagSource.getFeatures();

    features.forEach((feature) => {
      const name = feature.get('DZONGKHA');
      if (selectedDzongkhag && name === selectedDzongkhag) {
        feature.setStyle(highlightedStyle);
      } else {
        feature.setStyle(defaultStyle);
      }
    });

    if (selectedDzongkhag) {
      const selectedFeature = features.find(f => f.get('DZONGKHA') === selectedDzongkhag);
      if (selectedFeature) {
        const extent = selectedFeature.getGeometry().getExtent();
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 12,
          duration: 500,
        });
      }
    } else {
      map.getView().animate({
        center: fromLonLat(bhutanCenter),
        zoom: 8,
        duration: 500,
      });
    }
  }, [selectedDzongkhag]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const { vectorSource } = mapInstanceRef.current;
    const features = vectorSource.getFeatures().filter(f => !f.get('fireData'));

    const fireFeatures = fireData.map((fire) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([fire.longitude, fire.latitude])),
        fireData: fire,
      });

      feature.setStyle(new Style({
        image: new CircleStyle({
          radius: 3,
          fill: new Fill({ color: '#dc2626' }),
          stroke: new Stroke({ color: '#dc2626', width: 1 }),
        }),
      }));

      return feature;
    });

    vectorSource.clear();
    vectorSource.addFeatures([...features, ...fireFeatures]);
  }, [fireData]);

  return (
    <div className="map-container">
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      <div ref={popupRef} className="ol-popup" style={{ display: 'none' }}>
        {popupContent && (
          <div className="fire-popup">
            <h4>Fire Detection</h4>
            <p><strong>Date:</strong> {popupContent.date}</p>
            <p><strong>Time:</strong> {popupContent.time}</p>
            <p><strong>Location:</strong> {popupContent.lat}, {popupContent.lon}</p>
            <p><strong>Brightness:</strong> {popupContent.brightness} K</p>
            <p><strong>FRP:</strong> {popupContent.frp} MW</p>
            <p><strong>Confidence:</strong> {popupContent.confidence}%</p>
            <p><strong>Intensity:</strong> {popupContent.intensity}</p>
            <p><strong>Satellite:</strong> {popupContent.satellite} ({popupContent.instrument})</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FireMap;