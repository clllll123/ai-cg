
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { TaskProvider } from './context/TaskContext';
import { Homepage } from './pages/Homepage';
import { LoginPage } from './pages/auth/LoginPage';
import { Dashboard } from './pages/dashboard/Dashboard';
import LegacyGame from './components/LegacyGame';
import GamePlaza from './components/GamePlaza';
import GuideOverlay from './components/GuideOverlay';
import FloatingTaskButton from './components/FloatingTaskButton';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">加载中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <TaskProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/game-plaza" 
              element={
                <ProtectedRoute>
                  <GamePlaza />
                </ProtectedRoute>
              } 
            />
            {/* Allow direct access to game for now, or wrap in ProtectedRoute if desired */}
            {/* Note: LegacyGame handles its own view modes via query params */}
            <Route path="/game/*" element={<LegacyGame />} />
          </Routes>
          <GuideOverlay />
          <FloatingTaskButton />
        </Router>
      </TaskProvider>
    </UserProvider>
  );
};

export default App;
