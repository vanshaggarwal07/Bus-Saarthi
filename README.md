<div align="center">
  <img src="https://img.icons8.com/color/96/000000/bus.png" alt="Bus Saarthi Logo" width="100"/>
  <h1>🚌 Bus Saarthi</h1>
  <p><em>Your Intelligent Bus Tracking & Management System</em></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18.0.0-339933?logo=node.js)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-5.0.0-47A248?logo=mongodb)](https://www.mongodb.com/)
  [![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-010101?logo=socket.io)](https://socket.io/)

  [![Open in Visual Studio Code](https://img.shields.io/badge/Open%20in-VSCode-007ACC?logo=visualstudiocode)](https://open.vscode.dev/yourusername/Bus-Saarthi)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
</div>

## 🌟 Features

- 🚍 Real-time bus tracking and monitoring
- 📱 Responsive web interface for passengers and administrators
- 📊 Analytics and reporting dashboard
- 🔄 Live updates using WebSockets
- 📍 Route optimization and scheduling
- 🔔 Real-time notifications and alerts
- 📱 Mobile-friendly interface
- 🌍 Multi-language support

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite (Build Tool)
- Shadcn UI Components
- React Query (Data Fetching)
- i18next (Internationalization)
- React Router (Navigation)

### Backend
- Node.js with Express
- Socket.IO (Real-time communication)
- MongoDB (Database)
- Mongoose (ODM)
- Turf.js (Geospatial analysis)

### IoT & ML Components
- Real-time sensor data processing
- Predictive analytics for bus arrival times
- Route optimization algorithms

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+) or yarn
- MongoDB (v5.0+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vanshaggarwal07/Bus-Saarthi.git
   cd Bus-Saarthi
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../server
   npm install
   ```

3. **Environment Setup**
   - Create a `.env` file in the `server` directory with the following variables:
     ```env
     ATLAS_URI="mongodb+srv://admin:cHRdtZXGL3WKMQF2@cluster0.v5sk412.mongodb.net/punjab_yatra?retryWrites=true&w=majority&appName=Cluster0"
     MAPBOX_ACCESS_TOKEN = "pk.eyJ1Ijoic3RhcmsxMjM0IiwiYSI6ImNtZmh5cWVubzBqMXoyaXF0aDNneGg5OWQifQ._dySBvjJtseB2Y6t_iquUA"
     PORT=5000
     API_URL='http://localhost:5000/buses'
     API_BASE='http://localhost:5000'
     ```

4. **Running the Application**
   ```bash
   # Start the backend server (from server directory)
   npm run dev
   
   # In a new terminal, start the frontend (from frontend directory)
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000



## 🏗️ Project Structure

```
Bus-Saarthi/
├── frontend/               # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API services
│   │   └── styles/        # Global styles
│   └── ...
├── server/                # Backend server
│   ├── controllers/       # Route controllers
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   └── ...
├── IoT Hardware/          # Hardware components and schematics
├── ML Models/             # Machine learning models
└── ...
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

Gmail - mailto:vanshaggarwal07@gmail.com

Project Link: [https://github.com/vanshaggarwal07/Bus-Saarthi](https://github.com/vanshaggarwal07/Bus-Saarthi)

## 🙏 Acknowledgments

- [Icon by Icons8](https://icons8.com)
- [Shadcn UI](https://ui.shadcn.com/)
- [React Icons](https://react-icons.github.io/react-icons/)
- [Vite](https://vitejs.dev/)

---

<div align="center">
  Made with ❤️ by VANSH AGGARWAL | © 2025 Bus Saarthi
</div>