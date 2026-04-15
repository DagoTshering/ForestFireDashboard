import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import FireMap from './components/FireMap';
import { fetchFireData, fetchHottestMonth } from './services/api';
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
  const [selectedDzongkhag, setSelectedDzongkhag] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({ total: 0 });
  const [hottestMonth, setHottestMonth] = useState(null);

  useEffect(() => {
    loadFireData();
  }, [selectedDate, days]);

  useEffect(() => {
    loadHottestMonth();
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
      const result = await fetchFireData(dateStr, days);
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
