# MoveWise - Smart Traffic Management System

MoveWise is a comprehensive traffic management solution designed to optimize urban mobility, enhance road safety, and improve emergency response capability. It leverages real-time data, interactive mapping, and smart analytics to provide a robust platform for both administrators and general users.

## Features

*   **Real-time Traffic Monitoring:** Visualize traffic conditions using dynamic maps powered by Mapbox.
*   **Incident Reporting:** Users can report accidents, hazards, and other incidents directly through the interface.
*   **Live Updates:** Socket.io integration ensures real-time updates for incidents and traffic signal changes.
*   **Admin Dashboard:** specialized tools for traffic controllers to manage signals, view analytics, and handle emergency dispatch.
*   **Route Planning:** Intelligent routing that accounts for real-time traffic incidents.
*   **Analytics:** Visual insights into traffic patterns and incident data using interactive charts.

## Tech Stack

### Frontend
*   **Framework:** React (Vite)
*   **Mapping:** Mapbox GL JS, React Map GL
*   **State/Routing:** React Router DOM
*   **Styling:** CSS
*   **Real-time Communication:** Socket.io-client
*   **Visualization:** Chart.js, React-Chartjs-2
*   **Icons:** Lucide React

### Backend
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB (via Mongoose)
*   **Authentication:** JWT (JSON Web Tokens), Bcryptjs
*   **Real-time Communication:** Socket.io

## Project Structure

```
movewise/
├── client/         # Frontend React application
│   ├── src/        # Source code
│   └── public/     # Static assets
├── server/         # Backend Node.js application
│   ├── config/     # Configuration files
│   ├── models/     # Mongoose models
│   ├── routes/     # API routes
│   └── index.js    # Entry point
└── README.md       # Project documentation
```

## Getting Started

### Prerequisites

*   Node.js (v14 or higher recommended)
*   MongoDB (Local instance or Atlas connection)
*   Mapbox Account (for API Token)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd movewise
    ```

2.  **Install Client Dependencies:**
    ```bash
    cd client
    npm install
    ```

3.  **Install Server Dependencies:**
    ```bash
    cd ../server
    npm install
    ```

### Configuration

#### Server
Create a `.env` file in the `server` directory with the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

#### Client
Create a `.env` file in the `client` directory with the following variables:
```env
VITE_MAPBOX_TOKEN=your_mapbox_public_token
```

### Running the Application

1.  **Start the Backend Server:**
    Navigate to the `server` directory and run:
    ```bash
    npm run dev
    ```
    This will start the server with Nodemon for hot-reloading.

2.  **Start the Frontend Client:**
    Open a new terminal, navigate to the `client` directory and run:
    ```bash
    npm run dev
    ```
    This will launch the Vite development server.

3.  **Access the App:**
    Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).

## License

[MIT](LICENSE)
