import React, { useState } from "react";
import InovatechLogo from "./InovatechLogo.png";

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
}

/* Keyframes for Animations */
@keyframes orbit {
  from {
    transform: rotate(0deg) translateX(180px) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateX(180px) rotate(-360deg);
  }
}

@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Main Container */
.landing-container {
  min-height: 100vh;
  background: radial-gradient(circle at 20% 20%, rgba(11, 94, 215, 0.1), transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(11, 94, 215, 0.1), transparent 50%),
              #0f0e17;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.content-fader > * {
  animation: contentFadeIn 0.6s ease-in-out forwards;
}

/* Header & Navigation */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 5%;
  position: sticky;
  top: 0;
  background: rgba(15, 14, 23, 0.8);
  backdrop-filter: blur(10px);
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 1.3rem;
  gap: 12px;
  letter-spacing: 0.5px;
}

.logo-icon {
  display: flex;
  align-items: center;
}

.main-nav ul {
  display: flex;
  list-style: none;
  gap: 40px;
}

.main-nav li {
  cursor: pointer;
}

.main-nav li a {
  text-decoration: none;
  color: #a0a0a0;
  transition: color 0.3s;
  font-weight: 500;
  font-size: 0.95rem;
  pointer-events: none;
}

.main-nav li:hover a {
  color: #ffffff;
}

.main-nav li.active a {
  color: #ffffff;
  position: relative;
}

.main-nav li.active a::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #0b5ed7; /* Updated color */
  border-radius: 2px;
}

.auth-buttons {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-login {
  color: #e0e0e0;
  text-decoration: none;
  padding: 10px 20px;
  font-weight: 500;
  transition: color 0.3s;
}

.btn-login:hover {
  color: #ffffff;
}

.btn-join {
  background-color: #0b5ed7; /* Updated color */
  color: #ffffff;
  padding: 12px 28px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: transform 0.3s, box-shadow 0.3s;
}

.btn-join:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(11, 94, 215, 0.3); /* Updated color */
}

/* Hero Section */
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 100px 5% 80px;
  gap: 60px;
  min-height: calc(100vh - 80px);
}

.hero-content {
  flex: 1;
  max-width: 600px;
}

.hero-content h1 {
  font-size: 3.5rem;
  line-height: 1.15;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-content p {
  font-size: 1.15rem;
  line-height: 1.7;
  color: #b0b0b0;
  margin-bottom: 36px;
}

/* Call to Action Button */
.btn-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background-color: #0b5ed7; /* Updated color */
  color: white;
  text-decoration: none;
  padding: 16px 36px;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  border: none;
}

.btn-cta:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(11, 94, 215, 0.4); /* Updated color */
}

/* Animated Graphic */
.hero-graphic {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.orbit-container {
  position: relative;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  border: 1px solid rgba(11, 94, 215, 0.2); /* Updated color */
  background: radial-gradient(circle, rgba(11, 94, 215, 0.05), transparent 70%); /* Updated color */
}

.center-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  padding: 30px 40px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.center-circle h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0b5ed7; /* Updated color */
  margin: 0;
}

.center-circle p {
  color: #b0b0b0;
  margin: 8px 0 0 0;
  font-size: 0.95rem;
}

.orbit-item {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70px;
  height: 70px;
  margin: -35px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(11, 94, 215, 0.3); /* Updated color */
  animation: orbit 25s linear infinite;
}

.orbit-item svg {
  width: 32px;
  height: 32px;
  color: #0b5ed7; /* Updated color */
}

.orbit-item.item-1 { animation-delay: 0s; }
.orbit-item.item-2 { animation-delay: -4.17s; }
.orbit-item.item-3 { animation-delay: -8.34s; }
.orbit-item.item-4 { animation-delay: -12.51s; }
.orbit-item.item-5 { animation-delay: -16.68s; }
.orbit-item.item-6 { animation-delay: -20.85s; }

/* Content Sections */
.content-section {
  padding: 100px 5%;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.content-section h2 {
  font-size: 3rem;
  color: #ffffff;
  margin-bottom: 16px;
  font-weight: 700;
}

.content-section .subtitle {
  font-size: 1.25rem;
  color: #a0a0a0;
  margin-bottom: 70px;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

/* About Section */
.about-section .about-content {
  display: flex;
  gap: 60px;
  text-align: left;
  align-items: center;
}

.about-section .text-content {
  flex: 1;
}

.about-section .text-content h3 {
  color: #ffffff;
  font-size: 1.8rem;
  margin-bottom: 16px;
  font-weight: 600;
}

.about-section .text-content p {
  color: #b0b0b0;
  line-height: 1.8;
  margin-bottom: 32px;
  font-size: 1.05rem;
}

.about-section .image-content {
  flex: 1;
}

.about-visual {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.visual-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(11, 94, 215, 0.2); /* Updated color */
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  transition: transform 0.3s, background 0.3s;
}

.visual-card:hover {
  transform: translateY(-5px);
  background: rgba(11, 94, 215, 0.1); /* Updated color */
}

.visual-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.visual-card h4 {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
}

/* Features Section */
.features-category {
  margin-bottom: 70px;
}

.category-title {
  font-size: 1.8rem;
  color: #0b5ed7; /* Updated color */
  margin-bottom: 40px;
  font-weight: 600;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  text-align: left;
}

.feature-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 36px;
  border-radius: 16px;
  transition: transform 0.3s, background 0.3s, border 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px);
  background: rgba(11, 94, 215, 0.08); /* Updated color */
  border: 1px solid rgba(11, 94, 215, 0.3); /* Updated color */
}

.feature-card .icon {
  font-size: 2.8rem;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.4rem;
  color: #ffffff;
  margin-bottom: 14px;
  font-weight: 600;
}

.feature-card p {
  color: #b0b0b0;
  line-height: 1.7;
  font-size: 1rem;
}

/* Contact Section */
.contact-content {
  display: flex;
  flex-direction: column;
  gap: 60px;
  align-items: center;
}

.contact-info {
  display: flex;
  gap: 30px;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
}

.info-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(11, 94, 215, 0.2); /* Updated color */
  padding: 32px;
  border-radius: 16px;
  flex: 1;
  min-width: 250px;
  max-width: 300px;
  transition: transform 0.3s, background 0.3s;
}

.info-card:hover {
  transform: translateY(-5px);
  background: rgba(11, 94, 215, 0.1); /* Updated color */
}

.info-icon {
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.info-card h3 {
  color: #ffffff;
  font-size: 1.3rem;
  margin-bottom: 12px;
  font-weight: 600;
}

.info-card p {
  color: #0b5ed7; /* Updated color */
  font-size: 1rem;
  font-weight: 500;
}

.contact-cta {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(11, 94, 215, 0.2); /* Updated color */
  padding: 48px;
  border-radius: 20px;
  max-width: 600px;
}

.contact-cta h3 {
  color: #ffffff;
  font-size: 2rem;
  margin-bottom: 16px;
  font-weight: 600;
}

.contact-cta p {
  color: #b0b0b0;
  margin-bottom: 28px;
  font-size: 1.05rem;
}

/* Footer */
.main-footer {
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 60px 5% 30px;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto 40px;
}

.footer-section h4 {
  color: #ffffff;
  font-size: 1.1rem;
  margin-bottom: 16px;
  font-weight: 600;
}

.footer-section p {
  color: #a0a0a0;
  line-height: 1.6;
}

.footer-section a {
  display: block;
  color: #a0a0a0;
  text-decoration: none;
  margin-bottom: 10px;
  transition: color 0.3s;
}

.footer-section a:hover {
  color: #0b5ed7; /* Updated color */
}

.footer-bottom {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: #808080;
  font-size: 0.9rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding: 80px 5%;
  }

  .hero-content {
    max-width: 100%;
  }

  .hero-content h1 {
    font-size: 2.8rem;
  }

  .orbit-container {
    width: 350px;
    height: 350px;
  }

  .about-section .about-content {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .main-header {
    flex-wrap: wrap;
    gap: 20px;
  }

  .main-nav {
    order: 3;
    width: 100%;
  }

  .main-nav ul {
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .hero-content h1 {
    font-size: 2.2rem;
  }

  .hero-content p {
    font-size: 1rem;
  }

  .orbit-container {
    width: 300px;
    height: 300px;
  }

  .content-section h2 {
    font-size: 2.2rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .contact-info {
    flex-direction: column;
  }

  .footer-content {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .hero-content h1 {
    font-size: 1.8rem;
  }

  .btn-cta {
    padding: 14px 28px;
    font-size: 0.95rem;
  }

  .orbit-container {
    width: 250px;
    height: 250px;
  }

  .orbit-item {
    width: 50px;
    height: 50px;
    margin: -25px;
  }

  .orbit-item svg {
    width: 24px;
    height: 24px;
  }

  .content-section {
    padding: 60px 5%;
  }

  .footer-content {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("Home");
  const navLinks = ["Home", "About", "Features"];

  const scrollToSection = (link) => {
    setActiveTab(link);
  };

  return (
    <div className="landing-container">
      <header className="main-header">
        <div className="logo">
          <img
            src={InovatechLogo}
            alt="Inovatech"
            className="logo-image"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
          <span>Inovatech</span>
        </div>
        <nav className="main-nav">
          <ul>
            {navLinks.map((link) => (
              <li
                key={link}
                onClick={() => scrollToSection(link)}
                className={activeTab === link ? "active" : ""}
              >
                <a>{link}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="auth-buttons">
          <a href="/login" className="btn-login">
            Log In
          </a>
          <a href="/login" className="btn-join">
            Get Started
          </a>
        </div>
      </header>

      <main className="content-fader">
        {activeTab === "Home" && (
          <section className="hero-section">
            <div className="hero-content">
              <h1>
                Streamline Your Projects with Real-Time Tracking and Reporting
              </h1>
              <p>
                Replace outdated spreadsheets with a powerful, web-based system.
                Track projects continuously, collaborate seamlessly, and
                generate accurate weekly reports automatically.
              </p>
              <a href="/login" className="btn-cta">
                Get Started
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
            <div className="hero-graphic">
              <div className="orbit-container">
                <div className="center-circle">
                  <h2>100+</h2>
                  <p>Active Projects</p>
                </div>
                <div className="orbit-item item-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <div className="orbit-item item-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
                <div className="orbit-item item-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                  </svg>
                </div>
                <div className="orbit-item item-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <div className="orbit-item item-5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M4 9h4v11H4zm6-5h4v16h-4zm6 8h4v8h-4z" />
                  </svg>
                </div>
                <div className="orbit-item item-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "About" && (
          <section className="content-section about-section">
            <h2>About PMRS</h2>
            <p className="subtitle">
              Transforming project management with real-time collaboration and
              intelligent reporting.
            </p>
            <div className="about-content">
              <div className="text-content">
                <h3>Our Mission</h3>
                <p>
                  The Project Management and Reporting System is designed to
                  eliminate the inefficiencies of manual spreadsheet tracking.
                  We provide organizations with a comprehensive, real-time
                  solution that enables seamless collaboration, accurate data
                  management, and automated reporting.
                </p>
                <h3>Why Choose PMRS?</h3>
                <p>
                  Built for teams of all sizes, PMRS offers role-based access
                  control, complete audit trails, and intelligent automation.
                  Whether you're an admin overseeing operations, a manager
                  tracking progress, or an employee updating tasks, our system
                  adapts to your workflow and keeps everyone synchronized.
                </p>
              </div>
              <div className="image-content">
                <div className="about-visual">
                  <div className="visual-card">
                    <div className="visual-icon">📊</div>
                    <h4>Real-Time Data</h4>
                  </div>
                  <div className="visual-card">
                    <div className="visual-icon">🔒</div>
                    <h4>Secure Access</h4>
                  </div>
                  <div className="visual-card">
                    <div className="visual-icon">📈</div>
                    <h4>Automated Reports</h4>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "Features" && (
          <section className="content-section features-section">
            <h2>Platform Features</h2>
            <p className="subtitle">
              Everything you need to manage projects effectively, all in one
              place.
            </p>

            <div className="features-category">
              <h3 className="category-title">Internal Components</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="icon">📋</div>
                  <h3>Project Tracking</h3>
                  <p>
                    Create, update, and monitor project progress in real time.
                    Track status changes from In Progress to Completed, with
                    full visibility for your team.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">🔐</div>
                  <h3>User Authentication</h3>
                  <p>
                    Secure login system with role-based access control. Admins
                    manage users, employees access assigned projects, and
                    executives get read-only oversight.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">📝</div>
                  <h3>Logging & Audit Trail</h3>
                  <p>
                    Every action is logged with timestamps showing who made
                    changes and when. Deleted data is archived for complete
                    accountability and compliance.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">📊</div>
                  <h3>Report Generation</h3>
                  <p>
                    Generate automated weekly reports with a single click. View
                    comprehensive project summaries and metrics directly within
                    the system.
                  </p>
                </div>
              </div>
            </div>

            <div className="features-category">
              <h3 className="category-title">External Components</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="icon">👥</div>
                  <h3>Multi-Role Users</h3>
                  <p>
                    Support for Admins, Employees, Managers, and Executives.
                    Each role has tailored permissions ensuring the right access
                    for the right people.
                  </p>
                </div>
                <div className="feature-card">
                  <div className="icon">🗄️</div>
                  <h3>SQL Database</h3>
                  <p>
                    Robust database architecture storing projects, users, logs,
                    and reports. Ensures data integrity with efficient queries
                    and optimized performance.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Fun with Mama</h4>
            <p>Project Management and Reporting System</p>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Careers</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            &copy; 2024 Project Management and Reporting System. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
