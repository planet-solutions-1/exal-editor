import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist folder (Vite build output)
// This prevents 404 on chunk files by using absolute paths
app.use(express.static(path.join(__dirname, 'dist')));

// Load suggestions data
let suggestionsData = {};
try {
  const dataPath = path.join(__dirname, 'data', 'suggestions.json');
  if (fs.existsSync(dataPath)) {
    suggestionsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
} catch (error) {
  console.log('No suggestions data found, using empty dataset');
}

// API endpoint for backend suggestions
app.post('/api/suggestions', (req, res) => {
  const { column, value, allData } = req.body;
  
  try {
    // Get backend suggestions for this column
    const backendSuggestions = suggestionsData[column] || [];
    
    // Algorithm: Find common values from the data
    const columnValues = allData
      .map(row => row[column])
      .filter(v => v !== '' && v !== null && v !== undefined);
    
    // Frequency analysis
    const frequency = {};
    columnValues.forEach(val => {
      const key = String(val).toLowerCase();
      frequency[key] = (frequency[key] || 0) + 1;
    });
    
    // Get top 10 most common values
    const commonValues = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([val]) => columnValues.find(v => String(v).toLowerCase() === val));
    
    // Filter by search term if provided
    const searchTerm = String(value || '').toLowerCase();
    const filteredBackend = backendSuggestions.filter(s => 
      String(s).toLowerCase().includes(searchTerm)
    );
    
    const filteredCommon = commonValues.filter(s => 
      String(s).toLowerCase().includes(searchTerm)
    );
    
    // Deduplicate and limit to 50 total
    const allSuggestions = [
      ...new Set([...filteredBackend, ...filteredCommon])
    ].slice(0, 50);
    
    res.json({
      backend: filteredBackend.slice(0, 25),
      common: filteredCommon.slice(0, 25),
      all: allSuggestions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// SPA fallback - CRITICAL for React Router and preventing blank pages
// This ensures all routes serve index.html (React will handle routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Serving from: ${path.join(__dirname, 'dist')}`);
});
