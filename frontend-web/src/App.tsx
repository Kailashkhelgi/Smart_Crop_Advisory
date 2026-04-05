import React, { useState } from 'react';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import SoilProfilePage from './pages/SoilProfilePage';
import CropAdvisoryPage from './pages/CropAdvisoryPage';
import FertilizerPage from './pages/FertilizerPage';
import WeatherPage from './pages/WeatherPage';
import ImageAnalysisPage from './pages/ImageAnalysisPage';
import MarketPricePage from './pages/MarketPricePage';
import VoicePage from './pages/VoicePage';
import DashboardPage from './pages/DashboardPage';

type Page =
  | 'home' | 'register' | 'login'
  | 'dashboard' | 'profile' | 'soil-profile' | 'crop-advisory'
  | 'fertilizer' | 'weather' | 'image-analysis' | 'market-price'
  | 'voice' | 'admin-dashboard';

const FEATURES = [
  { icon: '🌾', title: 'Crop Advisory', desc: 'AI-powered crop recommendations based on your soil, location, and season.' },
  { icon: '🧪', title: 'Soil Analysis', desc: 'Input soil pH and NPK values to get tailored fertilizer guidance.' },
  { icon: '🌤', title: 'Weather Alerts', desc: 'Real-time weather alerts for heavy rainfall and frost risk.' },
  { icon: '📷', title: 'Pest Detection', desc: 'Upload a crop photo to instantly identify pests and diseases.' },
  { icon: '💰', title: 'Market Prices', desc: 'Live mandi prices from nearby markets to maximize your profit.' },
  { icon: '🎤', title: 'Voice Support', desc: 'Interact in English, Hindi, or Punjabi using voice commands.' },
];

const SIDEBAR_ITEMS = [
  { icon: '🏠', label: 'Dashboard', page: 'dashboard' },
  { icon: '👤', label: 'My Profile', page: 'profile' },
  { icon: '🌱', label: 'Soil Profile', page: 'soil-profile' },
  { icon: '🌾', label: 'Crop Advisory', page: 'crop-advisory' },
  { icon: '🧪', label: 'Fertilizer', page: 'fertilizer' },
  { icon: '🌤', label: 'Weather', page: 'weather' },
  { icon: '📷', label: 'Image Analysis', page: 'image-analysis' },
  { icon: '💰', label: 'Market Prices', page: 'market-price' },
  { icon: '🎤', label: 'Voice', page: 'voice' },
];

export default function App() {
  const [page, setPage] = useState<Page>(() =>
    localStorage.getItem('accessToken') ? 'dashboard' : 'home'
  );
  const [routeState, setRouteState] = useState<Record<string, string>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('accessToken'));

  function navigate(target: string, state?: Record<string, string>) {
    setPage(target as Page);
    if (state) setRouteState(state);
    window.scrollTo(0, 0);
  }

  function handleLogout() {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate('home');
  }

  // ── Navbar ──────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('home')} style={{ cursor: 'pointer' }}>
        <span>🌿</span> Smart Crop Advisory
      </div>
      <div className="navbar-links">
        {isLoggedIn ? (
          <>
            <button onClick={() => navigate('dashboard')}>Dashboard</button>
            <button onClick={() => navigate('crop-advisory')}>Crops</button>
            <button onClick={() => navigate('weather')}>Weather</button>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('home')}>Home</button>
            <button onClick={() => navigate('login')}>Login</button>
            <button className="btn-nav-cta" onClick={() => navigate('register')}>Register Free</button>
          </>
        )}
      </div>
    </nav>
  );

  // ── Home / Landing ───────────────────────────────────────────────────────
  if (page === 'home') {
    return (
      <>
        <Navbar />
        <section className="hero">
          <div className="hero-content">
            <h1>Smart Farming Starts Here 🌱</h1>
            <p>
              AI-powered crop advisory for small and marginal farmers in India.
              Get personalized guidance on crops, soil, weather, pests, and market prices — in your language.
            </p>
            <div className="hero-btns">
              <button className="btn-hero-primary" onClick={() => navigate('register')}>
                Get Started Free
              </button>
              <button className="btn-hero-secondary" onClick={() => navigate('login')}>
                Already a farmer? Login
              </button>
            </div>
          </div>
        </section>

        <section className="features">
          <h2>Everything a Farmer Needs</h2>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="footer">
          © 2026 Smart Crop Advisory System · Government of Punjab, Department of Higher Education
        </footer>
      </>
    );
  }

  // ── Auth pages ───────────────────────────────────────────────────────────
  if (page === 'register' || page === 'login') {
    return (
      <>
        <Navbar />
        <RegisterPage
          mode={page === 'login' ? 'login' : 'register'}
          onNavigate={(target) => {
            if (target === 'home') {
              setIsLoggedIn(true);
              setPage('dashboard');
              window.scrollTo(0, 0);
            } else {
              navigate(target);
            }
          }}
        />
      </>
    );
  }
  // ── Authenticated app layout ─────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <div className="app-layout">
        <aside className="sidebar">
          {SIDEBAR_ITEMS.map(item => (
            <div
              key={item.page}
              className={`sidebar-item ${page === item.page ? 'active' : ''}`}
              onClick={() => navigate(item.page)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
          <div className="sidebar-item" onClick={handleLogout} style={{ marginTop: 'auto', color: '#c62828' }}>
            <span className="icon">🚪</span> Logout
          </div>
        </aside>

        <main className="main-content">
          {page === 'dashboard' && <HomeDashboard navigate={navigate} />}
          {page === 'profile' && <ProfilePage onNavigate={navigate} />}
          {page === 'soil-profile' && <SoilProfilePage onNavigate={navigate} />}
          {page === 'crop-advisory' && <CropAdvisoryPage plotId="" onNavigate={navigate} />}
          {page === 'fertilizer' && <FertilizerPage plotId="" cropId="wheat" onNavigate={navigate} />}
          {page === 'weather' && <WeatherPage lat={30.7333} lon={76.7794} />}
          {page === 'image-analysis' && <ImageAnalysisPage onNavigate={navigate} />}
          {page === 'market-price' && <MarketPricePage />}
          {page === 'voice' && <VoicePage onNavigate={navigate} />}
          {page === 'admin-dashboard' && <DashboardPage role="officer" onNavigate={navigate} />}
        </main>
      </div>
    </>
  );
}

function HomeDashboard({ navigate }: { navigate: (p: string) => void }) {
  return (
    <div>
      <h1 className="page-title">Welcome back, Farmer 👋</h1>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">3</div><div className="stat-label">Soil Profiles</div></div>
        <div className="stat-card"><div className="stat-value">8</div><div className="stat-label">Advisory Sessions</div></div>
        <div className="stat-card"><div className="stat-value">5</div><div className="stat-label">Weather Alerts</div></div>
        <div className="stat-card"><div className="stat-value">4.2⭐</div><div className="stat-label">Avg Rating</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { icon: '🌾', label: 'Get Crop Advice', page: 'crop-advisory' },
          { icon: '🧪', label: 'Fertilizer Guide', page: 'fertilizer' },
          { icon: '🌤', label: 'Weather Alerts', page: 'weather' },
          { icon: '📷', label: 'Detect Pests', page: 'image-analysis' },
          { icon: '💰', label: 'Market Prices', page: 'market-price' },
          { icon: '🎤', label: 'Voice Assistant', page: 'voice' },
        ].map(item => (
          <div key={item.page} className="card" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => navigate(item.page)}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
            <div style={{ fontWeight: 600, color: 'var(--green-dark)' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
