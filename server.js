/**
 * Campus Help Desk - Backend Server
 * Technology Stack: Node.js, Express.js, fs module
 * Storage: requests.json
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'requests.json');

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Middleware to serve static frontend files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Helper function to ensure requests.json exists.
 * If the file does not exist, it creates it automatically with an empty array.
 */
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

/**
 * Helper function: Read requests from requests.json
 * @returns {Array} List of requests
 */
function readRequests() {
  try {
    ensureDataFile();
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading requests.json:', err);
    return [];
  }
}

/**
 * Helper function: Write requests to requests.json
 * @param {Array} requests - Array of request objects to save
 */
function writeRequests(requests) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to requests.json:', err);
    return false;
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

/**
 * GET /api/requests
 * Returns all submitted campus requests.
 */
app.get('/api/requests', (req, res) => {
  try {
    const requests = readRequests();
    // Return requests (sorted newest first)
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve requests' });
  }
});

/**
 * GET /api/requests/:id
 * Returns a single request matching the provided ID.
 */
app.get('/api/requests/:id', (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const requests = readRequests();
    const request = requests.find((r) => r.id === requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

/**
 * POST /api/requests
 * Creates and saves a new campus request.
 * Expected payload: { studentName, email, category, description, priority }
 */
app.post('/api/requests', (req, res) => {
  try {
    const { studentName, email, category, description, priority } = req.body;

    // Basic Validation
    if (!studentName || !email || !category || !description || !priority) {
      return res.status(400).json({
        error: 'Missing required fields. Please fill in all details.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address provided.' });
    }

    const requests = readRequests();

    // Generate unique numerical ID (max existing ID + 1, or 1 if empty)
    const newId = requests.length > 0 ? Math.max(...requests.map((r) => r.id || 0)) + 1 : 1;

    const newRequest = {
      id: newId,
      studentName: studentName.trim(),
      email: email.trim(),
      category: category.trim(),
      description: description.trim(),
      priority: priority.trim(),
      status: 'Pending', // Default status for every new request
      createdAt: new Date().toISOString()
    };

    requests.push(newRequest);

    const saved = writeRequests(requests);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save request to file' });
    }

    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({ error: 'Server error while creating request' });
  }
});

/**
 * PUT /api/requests/:id
 * Updates an existing campus request.
 * Editable fields: studentName, email, category, description, priority, status
 */
app.put('/api/requests/:id', (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { studentName, email, category, description, priority, status } = req.body;

    const requests = readRequests();
    const index = requests.findIndex((r) => r.id === requestId);

    if (index === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Validate fields if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
    }

    // Update the request with updated values or retain existing
    requests[index] = {
      ...requests[index],
      studentName: studentName !== undefined ? studentName.trim() : requests[index].studentName,
      email: email !== undefined ? email.trim() : requests[index].email,
      category: category !== undefined ? category.trim() : requests[index].category,
      description: description !== undefined ? description.trim() : requests[index].description,
      priority: priority !== undefined ? priority.trim() : requests[index].priority,
      status: status !== undefined ? status.trim() : requests[index].status,
      updatedAt: new Date().toISOString()
    };

    const saved = writeRequests(requests);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to update request' });
    }

    res.json(requests[index]);
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: 'Server error while updating request' });
  }
});

/**
 * DELETE /api/requests/:id
 * Deletes a request from requests.json by ID.
 */
app.delete('/api/requests/:id', (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const requests = readRequests();
    const index = requests.findIndex((r) => r.id === requestId);

    if (index === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const deletedRequest = requests.splice(index, 1)[0];
    const saved = writeRequests(requests);

    if (!saved) {
      return res.status(500).json({ error: 'Failed to delete request from file' });
    }

    res.json({
      message: 'Request deleted successfully',
      deleted: deletedRequest
    });
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ error: 'Server error while deleting request' });
  }
});

// Fallback route for single-page dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
ensureDataFile();
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 Campus Help Desk Server is running!`);
  console.log(`🚀 Access Dashboard at: http://localhost:${PORT}`);
  console.log(`📁 Data Storage File: ${DATA_FILE}`);
  console.log(`====================================================`);
});
