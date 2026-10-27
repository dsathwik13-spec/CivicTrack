import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { TrackPage } from './pages/TrackPage';
import { SubmitPage } from './pages/SubmitPage';
import { MyGrievancesPage } from './pages/MyGrievancesPage';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PublicDashboardPage } from './pages/PublicDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/track" element={<TrackPage />} />
              <Route path="/track/:id" element={<TrackPage />} />
              <Route path="/submit" element={<SubmitPage />} />
              <Route path="/my-grievances" element={<MyGrievancesPage />} />
              <Route path="/officer" element={<OfficerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/public-dashboard" element={<PublicDashboardPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />

          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--color-bg-card)',
                color: 'var(--color-charcoal)',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                boxShadow: 'var(--shadow-md)',
              },
            }}
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
