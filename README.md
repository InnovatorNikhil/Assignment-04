# Campus Help Desk

A modern, full-stack Student Portal web application where students can submit, track, and manage campus-related problems or requests (IT Support, Hostel, Library, Transport, Facilities, Academics).

Built as **Assignment 04** mini project with an intuitive, responsive dashboard inspired by modern university portals.

---

## Features

- **Dashboard Statistics**: 4 dynamic metric cards (Total Requests, Pending, In Progress, Resolved) calculated in real time from backend data.
- **Request Submission Form**:
  - Student Name
  - Email (with format validation)
  - Category dropdown (Academics, Hostel, Library, Transport, IT Support, Facilities, Other)
  - Priority dropdown (Low, Medium, High, Urgent)
  - Problem Description (multi-line textarea with character counter)
  - Real-time client-side validation
- **Recent Requests Tracker**:
  - Displays all campus tickets with ID badge, student info, department, description, priority badge, status badge, and date.
  - Interactive status filters: *All*, *Pending*, *In Progress*, *Resolved*.
  - Category dropdown filter.
  - Live search bar (searches across names, IDs, departments, descriptions).
- **Edit Modal**:
  - Allows editing request details and updating ticket status (Pending, In Progress, Resolved).
  - Updates saved seamlessly via `PUT /api/requests/:id`.
- **Delete Confirmation Modal**:
  - Prompts student confirmation before permanently removing the request via `DELETE /api/requests/:id`.
- **Real-Time UI Feedback**:
  - Floating toast notifications for Success, Error, and Info events.
  - Loading skeleton/spinner while fetching data.
  - Friendly empty state when no requests exist.
  - Error state with retry action if server is unreachable.
- **Fully Responsive Design**:
  - Left sidebar navigation on desktop (~240px).
  - Collapsible off-canvas drawer with touch-friendly overlay on mobile.
  - Adaptive cards view for mobile screens and comprehensive table view for desktop.

---

## Tech Stack

### Frontend
- **HTML5**: Semantic markup with clean structure and accessibility labels.
- **CSS3**: Vanilla CSS with custom properties (CSS variables), modern card layout, flexbox, and CSS grid. No heavy UI frameworks.
- **Vanilla JavaScript (ES6+)**: Pure JavaScript for state management and DOM updates.
- **Native Fetch API**: Performs all asynchronous CRUD requests to the backend (no Axios, no React).

### Backend
- **Node.js**: Asynchronous JavaScript runtime.
- **Express.js**: Lightweight REST API web server.
- **fs Module**: Node.js built-in filesystem module used for persistent file I/O.
- **RESTful API**: Clean HTTP endpoints following REST principles.

---

## Project Structure

```
c:/Users/dubey/oops sem 03/Assignment/
├── package.json         # Project metadata and dependencies (express)
├── server.js            # Express server & REST API controller
├── requests.json        # File-based database storing all student requests
├── README.md            # Project documentation and setup guide
└── public/              # Static frontend assets served by Express
    ├── index.html       # Student Portal dashboard structure
    ├── style.css        # Responsive styling and design system
    └── script.js        # Frontend client logic & Fetch API integration
```

---

## How to Install

1. Open your terminal in the project root directory:
   ```bash
   npm install
   ```

---

## How to Run

1. Start the server using the npm script:
   ```bash
   npm start
   ```

   *(Optional: For auto-reloading during development, run `npm run dev`)*

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## API Endpoints

| Method | Endpoint | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/requests` | Retrieve all student campus requests | Returns JSON array of request objects |
| **GET** | `/api/requests/:id` | Retrieve single request by ID | Returns request object or `404 Not Found` |
| **POST** | `/api/requests` | Submit a new request | Payload: `{ studentName, email, category, description, priority }` (Returns `201 Created` with new ID, default status `Pending`, and `createdAt` timestamp) |
| **PUT** | `/api/requests/:id` | Update an existing request | Payload: `{ studentName, email, category, description, priority, status }` (Returns updated request object) |
| **DELETE** | `/api/requests/:id` | Delete a request by ID | Deletes record from `requests.json` and returns confirmation message |

### Example Request Object:
```json
{
  "id": 1,
  "studentName": "Nikhil Dubey",
  "email": "student@example.com",
  "category": "IT Support",
  "description": "WiFi is not connecting in Computer Lab 3 on the 2nd floor.",
  "priority": "High",
  "status": "Pending",
  "createdAt": "2026-09-30T10:30:00.000Z"
}
```

---

## Data Storage

All campus requests are stored persistently inside:
```
requests.json
```
- The backend utilizes the Node.js built-in **`fs` module** (`fs.readFileSync` and `fs.writeFileSync`) to read and write ticket data.
- If `requests.json` does not exist upon starting `server.js`, it is automatically created as an empty array `[]`.
- No external database (such as MongoDB, PostgreSQL, or Supabase) is required, making the application portable, fast, and straightforward to explain during viva examinations.

---

## Viva & Demonstration Guide

1. **How is data persisted without a database?**
   - The server reads from and writes to `requests.json` using Node.js's built-in `fs` module on every `POST`, `PUT`, and `DELETE` operation.
2. **How does the frontend communicate with the backend?**
   - Native JavaScript `fetch()` API calls the `/api/requests` endpoints asynchronously with JSON payloads.
3. **How are the statistics cards calculated?**
   - In `public/script.js`, the `updateStatistics()` function calculates the lengths of filtered arrays (`status === 'Pending'`, `status === 'In Progress'`, `status === 'Resolved'`, and `total.length`) and updates the DOM dynamically.
