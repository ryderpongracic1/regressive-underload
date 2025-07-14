// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import Profile from './pages/Profile';
import Social from './pages/Social';
import './styles/App.css';
import { auth, db } from './firebaseConfig'; // Import auth and db
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function App() {
  // Effect to manage dark mode based on user settings in Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, let's fetch their settings
        const settingsRef = doc(db, 'userSettings', user.uid);
        try {
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists() && settingsSnap.data().darkMode) {
            document.body.classList.add('dark-mode');
          } else {
            document.body.classList.remove('dark-mode');
          }
        } catch (error) {
          console.error("Could not fetch user settings:", error);
          document.body.classList.remove('dark-mode');
        }
      } else {
        // No user is signed in, ensure dark mode is off
        document.body.classList.remove('dark-mode');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);


  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/social" element={<Social />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
