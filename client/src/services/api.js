const API_BASE_URL = 'http://localhost:3000';

export async function fetchFireData(days = 0) {
  let url = `${API_BASE_URL}/api/fire-data`;
  if (days > 0) {
    url += `?days=${days}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch fire data');
  }
  return response.json();
}

export async function fetchFireDataByDateRange(startDate, endDate) {
  const response = await fetch(
    `${API_BASE_URL}/api/fire-data?start=${startDate}&end=${endDate}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch fire data');
  }
  return response.json();
}

export async function fetchLatestFromAPI(days = 1) {
  const response = await fetch(`${API_BASE_URL}/api/fire-data/fetch-latest?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch latest fire data');
  }
  return response.json();
}

export async function fetchStatistics() {
  const response = await fetch(`${API_BASE_URL}/api/fire-data/statistics`);
  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }
  return response.json();
}
