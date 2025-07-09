import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig"; // Import auth for logout
import { signOut } from "firebase/auth";

// Basic Navbar styling (add more in a separate CSS file if preferred)
const navStyle = {
  backgroundColor: '#f0f0f0',
  padding: '10px 20px',
  marginBottom: '20px',
  display: 'flex',
  justifyContent: 'space-between', // Distributes space between links and logout
  alignItems: 'center',
  borderBottom: '1px solid #ccc'
};

const linkStyle = {
  marginRight: '15px',
  textDecoration: 'none',
  color: '#333',
  fontWeight: 'bold'
};

const logoutButtonStyle = {
  padding: '5px 10px',
  cursor: 'pointer',
  backgroundColor: '#ff5c5c',
  color: 'white',
  border: 'none',
  borderRadius: '4px'
};


function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // Redirect to login after logout
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };

  return (
    <nav style={navStyle}>
      <div> {/* Group navigation links */}
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        <Link to="/stats" style={linkStyle}>Statistics</Link>
        <Link to="/social" style={linkStyle}>Social</Link>
        <Link to="/profile" style={linkStyle}>Profile</Link>
      </div>
      <div> {/* Logout button on the right */}
         <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;