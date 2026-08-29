"use client";

import { useEffect } from "react";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import Planner from "./pages/Planner";
import ValueZone from "./pages/ValueZone";
import Footer from "./components/Footer";
import ContentStudio from "./components/ContentStudio";
import AuthModal from "./components/AuthModal";
import BillingModal from "./components/BillingModal";
import RubbaMark from "./components/RubbaMark";
import { StoreProvider, useStore } from "./lib/store";
import { track } from "./lib/analytics";

function Shell() {
  const { content, user, openAuth, signOut, openBilling, usageInfo, applyTier, dataMode } = useStore();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "return") {
      const tier = params.get("tier") || "plus";
      applyTier(tier);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [applyTier]);

  useEffect(() => {
    track("page_view", { path: location.pathname });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <div className="site-shell">
        <header className="head">
          <NavLink to="/" className="brand" aria-label="Rubba home">
            {content.brand.logoImage && !content.brand.logoImage.includes("rubba-lamp") ? (
              <img className="logo-img" src={content.brand.logoImage} alt="Rubba" />
            ) : (
              <>
                <span className="lamp">
                  <RubbaMark size={34} />
                </span>
                <b>{content.brand.name}</b>
              </>
            )}
          </NavLink>
          <nav className="head-nav" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>
              Plan
            </NavLink>
            <NavLink to="/value" className={({ isActive }) => (isActive ? "on" : "")}>
              Value Zone
            </NavLink>
          </nav>
          <nav className="head-auth" aria-label="Account">
            <span className="mode-pill" title="Which data the site is using">
              {dataMode === "mock" ? "Demo data" : "Live data"}
            </span>
            {content.monetization?.userGate.active && (
              <button type="button" className="head-link head-plans" onClick={openBilling}>
                <span className="head-plans-full">Plans · {usageInfo.unlimited ? "∞" : usageInfo.remaining} left</span>
                <span className="head-plans-short">{usageInfo.unlimited ? "∞" : usageInfo.remaining} left</span>
              </button>
            )}
            {user ? (
              <>
                <span className="hu">{user.name || user.email}</span>
                <button type="button" className="head-link" onClick={signOut}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <button type="button" className="head-link" onClick={openAuth}>
                  Login
                </button>
                <button type="button" className="hbtn" onClick={openAuth}>
                  Sign up
                </button>
              </>
            )}
          </nav>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<Planner />} />
            <Route path="/value" element={<ValueZone />} />
            <Route path="/value/blog/:slug" element={<ValueZone />} />
            <Route path="/resources" element={<ValueZone />} />
            <Route path="*" element={<Planner />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <ContentStudio />
      <AuthModal />
      <BillingModal />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Shell />
      </BrowserRouter>
    </StoreProvider>
  );
}
