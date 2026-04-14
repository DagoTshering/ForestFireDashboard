import { MapContainer, TileLayer, Rectangle, Popup } from 'react-leaflet';
import { BHUTAN_BOUNDS } from '../utils/constants';
import FireMarkers from './FireMarkers';
import 'leaflet/dist/leaflet.css';

function FireMap({ fireData }) {
  const center = [
    (BHUTAN_BOUNDS.minLat + BHUTAN_BOUNDS.maxLat) / 2,
    (BHUTAN_BOUNDS.minLon + BHUTAN_BOUNDS.maxLon) / 2,
  ];

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Rectangle
          bounds={[
            [BHUTAN_BOUNDS.minLat, BHUTAN_BOUNDS.minLon],
            [BHUTAN_BOUNDS.maxLat, BHUTAN_BOUNDS.maxLon],
          ]}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.05,
          }}
        >
          <Popup>Bhutan Border</Popup>
        </Rectangle>
        <FireMarkers fireData={fireData} />
      </MapContainer>
    </div>
  );
}

export default FireMap;
