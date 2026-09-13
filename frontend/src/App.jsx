import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CustomCursor from './components/CustomCursor';
import DashboardPage from './pages/DashboardPage';
import StartJourneyPage from './pages/StartJourneyPage';
import ActiveJourneyPage from './pages/ActiveJourneyPage';
import GuardianDashboardPage from './pages/GuardianDashboardPage';
import JourneyHistoryPage from './pages/JourneyHistoryPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuardiansPage from './pages/GuardiansPage';
import SOSModal from './components/SOSModal';
import EmergencyPopNotification from './components/EmergencyPopNotification';
import { api } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShieldCheck, RefreshCw } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-sm font-bold text-gray-300">Verifying VIGIL Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicAuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function MainAppContent() {
  const navigate = useNavigate();
  const [currentMode, setCurrentMode] = useState('safety'); // default safety mode
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [sosNotificationData, setSosNotificationData] = useState(null);
  const { user } = useAuth();

  const handleToggleMode = (mode) => {
    setCurrentMode(mode);
  };

  const dispatchSOSWithLocation = async (isSilent = false) => {
    let locData = { latitude: 12.9715987, longitude: 77.5945627, name: 'Live GPS Pin (High Precision)' };

    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        locData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: `GPS Location (${position.coords.latitude.toFixed(4)}°, ${position.coords.longitude.toFixed(4)}°)`
        };
      } catch (e) {
        console.warn('Geolocation fallback to telemetry default:', e);
      }
    }

    try {
      const res = await api.triggerSOS('active', isSilent, locData);
      if (res.success && res.alert) {
        setSosNotificationData(res.alert);
      }
    } catch (err) {
      console.error('SOS dispatch error:', err);
    }
  };

  const handleOpenSOS = () => {
    setIsSOSOpen(true);
    // Instant auto-call default enabled guardian Hari Kiran (+917659834470)
    window.location.href = 'tel:+917659834470';
    // Dispatch push notification to emergency mobile numbers and Google Maps location
    dispatchSOSWithLocation(false);
  };

  const handleConfirmSOS = async (isSilent) => {
    try {
      if (!isSilent) {
        window.location.href = 'tel:+917659834470';
      }
      await dispatchSOSWithLocation(isSilent);
      setIsSOSOpen(false);
      navigate('/guardian');
    } catch (err) {
      console.error('SOS dispatch error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] dark:bg-[#0B0F19] light:bg-slate-900 text-gray-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-300">
      
      {/* Dynamic Animated Dual-Ring Custom Pointer Cursor */}
      <CustomCursor />

      {/* Left Vertical Navigation Sidebar & Mobile Drawer */}
      <Sidebar
        currentMode={currentMode}
        onToggleMode={handleToggleMode}
        onOpenSOS={handleOpenSOS}
      />

      {/* Main Page Area offset by sidebar width on desktop */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Main Application Page Routes */}
        <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage
                  currentMode={currentMode}
                  onToggleMode={handleToggleMode}
                  onOpenSOS={handleOpenSOS}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <LoginPage />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicAuthRoute>
                <RegisterPage />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/start"
            element={
              <ProtectedRoute>
                <StartJourneyPage
                  onActivateSafetyMode={() => setCurrentMode('safety')}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/active"
            element={
              <ProtectedRoute>
                <ActiveJourneyPage
                  onOpenSOS={handleOpenSOS}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guardians"
            element={
              <ProtectedRoute>
                <GuardiansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guardian"
            element={
              <ProtectedRoute>
                <GuardianDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <JourneyHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mandatory Privacy Disclaimer Footer */}
      <footer className="bg-[#080B12] dark:bg-[#080B12] light:bg-slate-950 border-t border-white/10 px-4 py-6 text-xs text-gray-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-gray-300">
              VIGIL monitors journeys ONLY when Safety Mode is activated.
            </span>
          </div>

          <p className="text-[11px] text-gray-500 max-w-xl">
            VIGIL AI Virtual Safety Companion. Voluntary telemetry signals processed by explainable risk rules. No unauthorized background tracking during Normal Mode.
          </p>

          <div className="text-[11px] text-cyan-400 font-mono">
            India Emergency: 112
          </div>
        </div>
      </footer>
      </div>

      {/* Global SOS Modal Drawer */}
      <SOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        userProfile={user}
        onConfirmSOS={handleConfirmSOS}
      />

      {/* Global Real-Time Emergency Pop Notification Overlay */}
      <EmergencyPopNotification
        alertData={sosNotificationData}
        onClose={() => setSosNotificationData(null)}
      />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
