import { Circle, Popup } from 'react-leaflet';
import { isWithinBhutanRegion } from '../utils/constants';

function FireMarkers({ fireData }) {
  if (!fireData || fireData.length === 0) {
    return null;
  }

  const getIntensityLabel = (frp) => {
    if (frp >= 60) return 'Extreme';
    if (frp >= 30) return 'High';
    if (frp >= 10) return 'Moderate';
    return 'Low';
  };

  return (
    <>
      {fireData.map((fire, index) => {
        if (!isWithinBhutanRegion(fire.latitude, fire.longitude)) {
          return null;
        }

        const intensity = getIntensityLabel(fire.frp);
        const radius = Math.max(5, Math.min(15, (fire.confidence || 50) / 10));

        return (
          <Circle
            key={`${fire.id || index}-${fire.latitude}-${fire.longitude}`}
            center={[fire.latitude, fire.longitude]}
            radius={radius * 100}
            pathOptions={{
              color: '#dc2626',
              fillColor: '#dc2626',
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup>
              <div className="fire-popup">
                <h4>Fire Detection</h4>
                <p><strong>Date:</strong> {fire.acq_date}</p>
                <p><strong>Time:</strong> {fire.acq_time}</p>
                <p><strong>Location:</strong> {fire.latitude.toFixed(4)}, {fire.longitude.toFixed(4)}</p>
                <p><strong>Brightness:</strong> {fire.brightness} K</p>
                <p><strong>FRP:</strong> {fire.frp} MW</p>
                <p><strong>Confidence:</strong> {fire.confidence}%</p>
                <p><strong>Intensity:</strong> {intensity}</p>
                <p><strong>Satellite:</strong> {fire.satellite} ({fire.instrument})</p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

export default FireMarkers;
