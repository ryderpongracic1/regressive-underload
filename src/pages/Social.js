import React from "react";
import Navbar from "../components/Navbar.js";

const mockUsers = [
  { id: 1, name: "John Doe", avatar: "https://placehold.co/60x60 ", workouts: 5 },
  { id: 2, name: "Jane Smith", avatar: "https://placehold.co/60x60 ", workouts: 3 },
  { id: 3, name: "Alex Johnson", avatar: "https://placehold.co/60x60 ", workouts: 7 },
];

function Social() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="p-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center">Social Feed</h1>
          <p className="text-gray-400 text-center mt-2">Connect with other fitness enthusiasts</p>
        </header>

        {/* User List */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="bg-gray-800 rounded-lg p-4 flex items-center space-x-4 hover:bg-gray-700 transition-colors"
            >
              {/* Avatar */}
              <img
                src={user.avatar}
                alt={`${user.name}'s avatar`}
                className="w-12 h-12 rounded-full object-cover"
              />
              {/* Details */}
              <div>
                <h3 className="text-lg font-medium">{user.name}</h3>
                <p className="text-sm text-gray-400">{user.workouts} workouts this week</p>
              </div>
              {/* Follow Button */}
              <button className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium">
                Follow
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default Social;