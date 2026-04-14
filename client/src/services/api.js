const API_BASE_URL = 'http://localhost:3000';

export async function fetchFireData(date = null, days = 0) {
  let url = `${API_BASE_URL}/api/fire-data`;
  const params = [];
  
  if (date) {
    params.push(`date=${date}`);
  }
  if (days !== null && days !== undefined && days !== '') {
    params.push(`days=${days}`);
  }
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch fire data');
  }
  return response.json();
}

export async function fetchHottestMonth() {
  const response = await fetch(`${API_BASE_URL}/api/fire-data/hottest-month`);
  if (!response.ok) {
    throw new Error('Failed to fetch hottest month');
  }
  return response.json();
}
