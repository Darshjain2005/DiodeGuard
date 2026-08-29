import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LiveDetection from './pages/LiveDetection';
import AlertsPage from './pages/AlertsPage';
import TrafficAnalytics from './pages/TrafficAnalytics';
import ModelPerformance from './pages/ModelPerformance';
import SystemHealth from './pages/SystemHealth';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/live" element={<LiveDetection />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/traffic" element={<TrafficAnalytics />} />
          <Route path="/models" element={<ModelPerformance />} />
          <Route path="/health" element={<SystemHealth />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;