import { useState, useEffect } from 'react';
import FireMap from './components/FireMap';
import { fetchFireData, fetchLatestFromAPI } from './services/api';
import { isWithinBhutanRegion } from './utils/constants';
import './App.css';

function App() {
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({ total: 0 });

  useEffect(() => {
    loadFireData();
  }, [days]);

  const loadFireData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFireData(days);
      if (result.success) {
        const bhutanFires = (result.data || []).filter(f =>
          isWithinBhutanRegion(f.latitude, f.longitude)
        );
        setFireData(bhutanFires);
        setLastUpdated(new Date());
        setStats({ total: bhutanFires.length });
      }
    } catch (err) {
      setError('Failed to load fire data. Make sure the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchLatestFromAPI(days);
      await loadFireData();
    } catch (err) {
      setError('Failed to refresh data');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Bhutan Fire Detection</h1>
          <p className="subtitle">Real-time fire monitoring using NASA FIRMS data</p>
        </div>
        <div className="header-stats">
          <span className="stat">
            <strong>{stats.total}</strong> fire detections
          </span>
        </div>
      </header>

      <div className="controls">
        <div className="control-group">
          <label htmlFor="days">Time Period:</label>
          <select
            id="days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={0}>All Time</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <button onClick={handleRefresh} disabled={loading} className="refresh-btn">
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
        {lastUpdated && (
          <span className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <main className="main-content">
        {loading && fireData.length === 0 ? (
          <div className="loading">Loading fire data...</div>
        ) : (
          <FireMap fireData={fireData} />
        )}
      </main>

      <footer className="footer">
        <p>Data source: NASA FIRMS | VIIRS</p>
        <p>Region: Bhutan and surrounding areas</p>
      </footer>
    </div>
  );
}

export default App;
