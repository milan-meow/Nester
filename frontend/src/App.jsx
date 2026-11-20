import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import PropertyDetail from './pages/PropertyDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import PropertyForm from './pages/PropertyForm.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { useAuth } from './auth.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="container muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/sell" element={<RequireAuth><PropertyForm /></RequireAuth>} />
          <Route path="/properties/:id/edit" element={<RequireAuth><PropertyForm /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="*" element={<div className="container"><h2>Page not found</h2></div>} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Nestar · Find your place, under your star.</div>
      </footer>
    </>
  );
}
