# Bhutan Forest Fire Detection

Real-time fire monitoring system for Bhutan using NASA FIRMS VIIRS satellite data. This project fetches, stores, and displays fire detection data on an interactive map.

## Features

- **Real-time Monitoring**: Automatic fire detection updates every 15 minutes via NASA FIRMS VIIRS S-NPP satellite
- **Historical Data**: Import historical fire data from downloaded NASA FIRMS shapefiles
- **Interactive Map**: Web-based map visualization using Leaflet and OpenStreetMap
- **Bhutan Focus**: Filters fire data to Bhutan borders with 10km buffer zone
- **Data Export**: REST API for accessing fire data programmatically

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js |
| Database | PostgreSQL (via Docker) |
| ORM | Sequelize |
| Frontend | React, Vite |
| Maps | Leaflet, React-Leaflet |
| Satellite Data | NASA FIRMS VIIRS S-NPP |

## Prerequisites

Before setting up, ensure you have:

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) v18 or higher
- **NASA FIRMS API Key** - [Request free API key](https://firms.modaps.eosdis.nasa.gov/api/data_availability)
- **NASA FIRMS Shapefile Data** - [Download VIIRS S-NPP archive](https://firms.modaps.eosdis.nasa.gov/download/) for historical data

## Project Structure

```
ForestFireDetection/
├── server/                      # Node.js Backend (Express API)
│   ├── config/
│   │   └── database.js          # PostgreSQL Sequelize configuration
│   ├── controllers/
│   │   └── fireDataController.js # API request handlers
│   ├── models/
│   │   └── FireData.js          # Fire detection Sequelize model
│   ├── routes/
│   │   └── fireDataRoutes.js    # API route definitions
│   ├── services/
│   │   └── nasaFirmsService.js # NASA FIRMS API integration
│   ├── scripts/
│   │   └── importShapefile.js   # Historical SHP data importer
│   ├── Data/                    # Shapefile data (user-provided)
│   ├── app.js                   # Express application
│   ├── server.js                # Server entry point (includes real-time fetcher)
│   └── package.json
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── FireMap.jsx     # Main map with Bhutan bounds
│   │   │   └── FireMarkers.jsx  # Fire detection circle markers
│   │   ├── services/
│   │   │   └── api.js          # Backend API client
│   │   ├── utils/
│   │   │   └── constants.js    # Bhutan bounds, intensity logic
│   │   ├── App.jsx             # Main React component
│   │   ├── App.css             # Styles
│   │   └── main.jsx            # React entry point
│   ├── index.html
│   └── package.json
├── docker-compose.yml            # PostgreSQL container
├── .env                         # Environment variables (create from .env.example)
├── .gitignore                   # Git ignore rules
└── README.md
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd ForestFireDetection

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# NASA FIRMS API Key (required - get from https://firms.modaps.eosdis.nasa.gov/api/data_availability)
NASA_API_KEY=your_nasa_api_key_here

# PostgreSQL Configuration (match docker-compose.yml)
DB_USER=fireuser
DB_PASSWORD=firepass123
DB_NAME=forestfire
DB_HOST=localhost
DB_PORT=5432

# Server Port
PORT=3000

# Bhutan Bounding Box (Bhutan strict bounds + 10km buffer)
BHUTAN_BBOX=88.4,26.4,92.6,28.6
```

### 3. Start PostgreSQL Database

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify container is running
docker ps
```

### 4. Import Historical Fire Data

Place your NASA FIRMS shapefile in `server/Data/` directory. The file should be named:
- `fire_archive_SV-C2_739417.shp` (and associated .dbf, .shx, .prj, .cpg files)

```bash
cd server

# Import historical data from shapefile
npm run import-shp
```

### 5. Start the Backend Server

The server includes an integrated real-time fetcher that automatically runs every 15 minutes.

```bash
cd server
npm start
```

You should see:
```
Database connection established successfully.
Database synchronized.
Server is running on port 3000
Health check: http://localhost:3000/health
API endpoint: http://localhost:3000/api/fire-data
Real-time fetcher: Running every 15 minutes
```

### 6. Start the Frontend

In a new terminal:

```bash
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## Data Sources

### Historical Data (Shapefile)
- Source: NASA FIRMS VIIRS S-NPP Archive
- Format: ESRI Shapefile (.shp, .dbf, .shx, .prj)
- Coverage: User-provided (typically 3-12 months)
- Import method: One-time `npm run import-shp`

### Real-time Data (API)
- Source: NASA FIRMS VIIRS S-NPP NRT (Near Real-Time)
- Coverage: Last 24 hours, updated every 15 minutes
- Endpoint: https://firms.modaps.eosdis.nasa.gov/api/area/csv/

## Bhutan Region

### Bhutan Bounds (Strict)
| Direction | Coordinate |
|-----------|------------|
| West | 88.5° |
| South | 26.5° |
| East | 92.5° |
| North | 28.5° |

### Monitoring Region (Bhutan + 10km Buffer)
| Direction | Coordinate |
|-----------|------------|
| West | 88.4° |
| South | 26.4° |
| East | 92.6° |
| North | 28.6° |

The system monitors Bhutan plus a 10km surrounding buffer zone to capture fires that may affect Bhutan. This is the bounding box used for NASA FIRMS API queries.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/fire-data` | Get all fire data |
| GET | `/api/fire-data?days=N` | Get last N days |
| GET | `/api/fire-data?start=YYYY-MM-DD&end=YYYY-MM-DD` | Custom date range |
| GET | `/api/fire-data/fetch-latest?days=N` | Fetch latest from NASA and save |
| GET | `/api/fire-data/statistics` | Daily fire statistics |

## API Examples

```bash
# Get all fire data
curl http://localhost:3000/api/fire-data

# Get last 7 days
curl http://localhost:3000/api/fire-data?days=7

# Get custom date range
curl "http://localhost:3000/api/fire-data?start=2025-03-01&end=2025-03-31"

# Fetch latest data from NASA
curl http://localhost:3000/api/fire-data/fetch-latest?days=1

# Get statistics
curl http://localhost:3000/api/fire-data/statistics
```

## Frontend Features

- **Interactive Map**: Pan, zoom, and click on fire markers
- **Time Filter**: Filter by All Time, 7 days, 14 days, 30 days, 90 days
- **Refresh Button**: Manually trigger data fetch from NASA API
- **Fire Details Popup**: Click a marker to see date, time, location, brightness, FRP, confidence
- **Bhutan Border**: Blue outline showing Bhutan boundaries with 10km buffer

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps

# View PostgreSQL logs
docker logs forest_fire_db
```

### API Key Issues
If you see "API key invalid" errors:
1. Verify your NASA API key is correct in `.env`
2. Get a new key from https://firms.modaps.eosdis.nasa.gov/api/key

### No Fire Data Showing
```bash
# Check database record count
curl http://localhost:3000/api/fire-data | jq '.count'

# Verify Bhutan bounds filtering is working
# Historical data may have gaps depending on fire season
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

## Development

### Run Backend in Development Mode
```bash
cd server
npm run dev
```

### Rebuild Frontend
```bash
cd client
npm run build
```

## License

This project is for educational and research purposes. Fire data courtesy of NASA FIRMS.
