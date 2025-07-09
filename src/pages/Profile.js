import React from "react";
import Navbar from "../components/Navbar"; // Assuming Navbar is in components

function Profile() {
  return (
    <div>
      <Navbar /> {/* Include Navbar on this page too */}
      <h1>Profile Page</h1>
      <p>User profile settings will go here...</p>
      {/* You can add basic layout or placeholders */}
    </div>
  );
}

export default Profile;