import React from 'react';
// 1. Make sure useLocation is imported
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import AICoachButton from './AICoachButton';

// (Your styles here)
const navStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#333',
    color: 'white'
};

const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    margin: '0 1rem'
};

const logoutButtonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
};


function Navbar() {
  const navigate = useNavigate();
  // 2. Get the pathname directly from useLocation() to avoid the name conflict
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  // 3. Use the new 'pathname' variable for your condition
  const showAICoachButton = pathname !== '/profile';

  return (
    <>
      <nav style={navStyle}>
        <div>
          <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
          <Link to="/stats" style={linkStyle}>Statistics</Link>
          <Link to="/social" style={linkStyle}>Social</Link>
          <Link to="/profile" style={linkStyle}>Profile</Link>
        </div>
        <div>
          <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>
        </div>
      </nav>
      {/* This will now work without errors */}
      {showAICoachButton && <AICoachButton />}
    </>
  );
}

export default Navbar;