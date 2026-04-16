import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import FireMap from './components/FireMap';
import { fetchFireData, fetchHottestMonth, fetchSourceCounts } from './services/api';
import { isWithinBhutanRegion } from './utils/constants';
import { DatePicker } from './components/ui/date-picker';
import { DzongkhagSelector } from './components/ui/dzongkhag-selector';
import './App.css';

const DZONGKHAGS = [
  'Bumthang', 'Chhukha', 'Dagana', 'Gasa', 'Haa', 'Lhuentse', 'Monggar',
  'Paro', 'Pemagatshel', 'Punakha', 'Samdrupjongkhar', 'Samtse', 'Sarpang',
  'Thimphu', 'Trashigang', 'Trongsa', 'Tsirang', 'Wangduephodrang', 'Yangtse', 'Zhemgang'
];

function formatHottestMonth(monthStr, count) {
  if (!monthStr) return null;
  const date = parse(monthStr, 'yyyy-MM', new Date());
  const monthName = format(date, 'MMMM yyyy');
  return `${monthName} (${count} fires)`;
}

function App() {
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [days, setDays] = useState(0);
  const [selectedSource, setSelectedSource] = useState('VIIRS_N');
  const [selectedDzongkhag, setSelectedDzongkhag] = useState(null);
  const [basemap, setBasemap] = useState('street');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({ total: 0 });
  const [sourceCounts, setSourceCounts] = useState({ VIIRS_N: 0, VIIRS_J1: 0, MODIS: 0 });
  const [hottestMonth, setHottestMonth] = useState(null);

  useEffect(() => {
    loadFireData();
  }, [selectedDate, days, selectedSource]);

  useEffect(() => {
    loadHottestMonth();
  }, []);

  useEffect(() => {
    loadSourceCounts();
  }, []);

  const loadHottestMonth = async () => {
    try {
      const result = await fetchHottestMonth();
      if (result.success && result.month) {
        setHottestMonth(formatHottestMonth(result.month, result.count));
      }
    } catch (err) {
      console.error('Failed to load hottest month:', err);
    }
  };

  const loadFireData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const result = await fetchFireData(dateStr, days, selectedSource);
      if (result.success) {
        const bhutanFires = (result.data || []).filter(f =>
          isWithinBhutanRegion(f.latitude, f.longitude)
        );
        setFireData(bhutanFires);
        setLastUpdated(new Date());
        setStats({ total: bhutanFires.length });
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load fire data. Make sure the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSourceCounts = async () => {
    try {
      const result = await fetchSourceCounts();
      if (result.success && result.data) {
        setSourceCounts({
          VIIRS_N: result.data.VIIRS_N || 0,
          VIIRS_J1: result.data.VIIRS_J1 || 0,
          MODIS: result.data.MODIS || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load source counts:', err);
    }
  };

  const totalSourceCount = (sourceCounts.VIIRS_N || 0) + (sourceCounts.VIIRS_J1 || 0) + (sourceCounts.MODIS || 0);

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
          {hottestMonth && (
            <span className="stat">
              Hottest: <strong>{hottestMonth}</strong>
            </span>
          )}
        </div>
      </header>

      <div className="controls">
        <div className="control-group">
          <label htmlFor="date">End Date:</label>
          <DatePicker
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            maxDate={new Date()}
          />
        </div>
        <div className="control-group">
          <label htmlFor="days">Days:</label>
          <select
            id="days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={0}>All Time</option>
            {[...Array(31)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Last {i + 1} {i + 1 === 1 ? 'day' : 'days'}
              </option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="dzongkhag">Dzongkhag:</label>
          <DzongkhagSelector
            dzongkhags={DZONGKHAGS}
            selected={selectedDzongkhag}
            onSelect={setSelectedDzongkhag}
          />
        </div>
        <div className="control-group">
          <label htmlFor="source">Data Source:</label>
          <select
            id="source"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            <option value="VIIRS_N">N (VIIRS) - {sourceCounts.VIIRS_N}</option>
            <option value="VIIRS_J1">J1 VIIRS C2 - {sourceCounts.VIIRS_J1}</option>
            <option value="MODIS">MODIS - {sourceCounts.MODIS}</option>
            <option value="ALL">All Sources - {totalSourceCount}</option>
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="basemap">Map:</label>
          <select
            id="basemap"
            value={basemap}
            onChange={(e) => setBasemap(e.target.value)}
          >
            <option value="street">Current</option>
            <option value="satellite">Satellite</option>
          </select>
        </div>
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
          <FireMap
            fireData={fireData}
            selectedDzongkhag={selectedDzongkhag}
            onDzongkhagClick={setSelectedDzongkhag}
            basemap={basemap}
            selectedSource={selectedSource}
          />
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
