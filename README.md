# RNTBCI Vehicle Trunk Optimizer

## 📌 Project Overview
The **RNTBCI Vehicle Trunk Optimizer** is an intelligent packing assistant designed to maximize vehicle trunk space utilization. By leveraging 3D geometry processing and optimization algorithms, the application simulates and visualizes how luggage fits into specific vehicle models (such as the Renault Kiger).

This project consists of a **Python FastAPI backend** for complex 3D calculations and a **React Native (Expo) mobile application** for an intuitive user experience.

---

## ✨ Key Features

- **🚗 Vehicle Selection**: Choose from pre-loaded vehicle models (e.g., Renault Kiger) or upload your own trunk geometry (`.stl` format).
- **bag Smart Bag Management**: Add standard bag sizes (Cabin, Check-in) or define **Custom Bags** with specific dimensions.
- **🧠 AI-Powered Optimization**: A robust Python backend uses `trimesh` and heuristic packing algorithms to calculate the optimal arrangement of bags to maximize volume usage.
- **📊 3D Visualization & Analytics**: View the packed trunk in 3D, see which bags fit (and which didn't), and analyze space utilization stats.
- **👤 User Accounts**: Secure Login and Registration system backed by MongoDB.

---

## 🏗 Tech Stack

### Frontend (Mobile App)
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **UI Components**: Custom styled components, `lucide-react-native` for icons
- **Animations**: `react-native-reanimated` for smooth UI transitions
- **Networking**: `axios` for API communication

### Backend (API)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **3D Processing**: `trimesh`, `numpy`, `scipy` for mesh manipulation and geometric calculations
- **Database**: [MongoDB](https://www.mongodb.com/) (via `pymongo`)

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- [Node.js](https://nodejs.org/) & npm
- [Python 3.8+](https://www.python.org/)
- [MongoDB Atlas](https://www.mongodb.com/atlas/database) account (or a local instance)

### 1. Backend Setup
The backend handles the core packing logic and database interactions.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Mac/Linux
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Configure Environment Variables:
    - Ensure you have a `.env` file in the `backend/` directory with your MongoDB connection string:
    ```env
    MONGO_URI="your_mongodb_connection_string"
    ```

5.  Run the Server:
    ```bash
    python api.py
    ```
    The server will start at `http://0.0.0.0:8000`.

### 2. Frontend (Mobile App) Setup

1.  Navigate to the mobile app directory:
    ```bash
    cd mobile_app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the Expo development server:
    ```bash
    npx expo start
    ```

4.  Test on your device:
    - Scan the QR code with the **Expo Go** app (Android/iOS) or run on an emulator.
    - **Note:** Ensure your phone and computer are on the **same Wi-Fi network**. You may need to update the API base URL in `mobile_app/src/api/client.js` to your computer's local IP address (e.g., `http://192.168.1.5:8000`) instead of `localhost`.

---

## 📱 How to Use

1.  **Login/Register**: Create an account to get started.
2.  **Select Vehicle**:
    - Choose **"Renault Kiger"** for the standard demo.
    - Or select **"Custom Vehicle"** to upload a trunk `.stl` file from your device.
3.  **Add Bags**:
    - Choose standard bag types.
    - Or use **"Custom Bags"** to enter specific Length, Width, and Height.
4.  **Optimize**: Tap "Optimize Packing". The app will send the data to the backend.
5.  **View Results**:
    - See the **Success Rate** and **Volume Utilization**.
    - Review the list of **Placed** vs **Unplaced** bags.
    - (Coming Soon) Interactive 3D view of the packing result.

---

## 📂 Project Structure

```
RNTBCI_NEW_final/
├── backend/                # Python FastAPI Server
│   ├── api.py              # Main application entry point
│   ├── core/               # Packing algorithms & Logic
│   └── requirements.txt    # Python dependencies
│
├── mobile_app/             # React Native Expo App
│   ├── src/
│   │   ├── screens/        # UI Screens (Home, Dashboard, etc.)
│   │   ├── components/     # Reusable UI components
│   │   └── api/            # API client configuration
│   └── App.js              # Main App component
│
└── README.md               # Project Documentation
```

## 📄 License
This project is licensed under the MIT License.