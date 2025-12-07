const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Fallback to planet_editor if no file match (optional, good for SPA feel)
// But essentially we just want to serve the HTML files.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'planet_editor.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
