// src/pages/Dashboard.js
import React, { useEffect, useState } from "react";
// Remove db import if only used for fetch/save within WorkoutSession
// Keep auth import if needed for onAuthStateChanged
import { auth } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth"; // Remove signOut import
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Keep db if fetchSessions remains here
import WorkoutSession from "../components/WorkoutSession";
import "../styles/Dashboard.css";
// Import the Navbar
import Navbar from "../components/Navbar";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [sessionsByDocId, setSessionsByDocId] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const navigate = useNavigate();

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  };

 useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUser(usr);
        console.log(`onAuthStateChanged: User authenticated with UID='${usr.uid}'`);
        fetchSessions(usr.uid);
      } else {
        // Redirect to login if user is not authenticated
        navigate("/login");
      }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
     // Assuming navigate is stable, but check React exhaustive-deps lint rule
  }, [navigate]);


  const fetchSessions = async (userId) => {
     console.log(`WorkspaceSessions: Querying with userId='${userId}'`);
     if (!userId) {
        console.log("Fetch aborted: No user ID provided.");
        return;
     }
     const sessionsRef = collection(db, "sessions");
     // Query requires index on userId (asc) and date (asc)
     const q = query(sessionsRef, where("userId", "==", userId), orderBy("date", "asc"));

     try {
       const querySnapshot = await getDocs(q);
       let dataMap = {};
       querySnapshot.forEach((docSnap) => {
         console.log("Fetched doc ID:", docSnap.id, "Data:", docSnap.data());
         console.log(`WorkspaceSessions: Fetched doc ${docSnap.id} contains userId='${docSnap.data().userId}'`);
         dataMap[docSnap.id] = docSnap.data();
       });
       console.log("Setting sessionsByDocId state with:", dataMap);
       setSessionsByDocId(dataMap);
     } catch (error) {
       console.error("Error fetching sessions from Firestore:", error);
       // Avoid alert for index errors now, maybe just log or set an error state
       // alert(`Error fetching workouts: ${error.message}`);
     }
  };


  const updateSessionsForDate = (isoDate, newSessions) => {
    if (!user?.uid) return;
    const docId = `${user.uid}_${isoDate}`;
    setSessionsByDocId((prev) => {
      let updated = { ...prev };
      updated[docId] = {
        ...(updated[docId] || {}),
        userId: user.uid,
        date: isoDate,
        sessions: newSessions,
      };
      return updated;
    });
  };

  // Remove the old handleLogout function - it's now in Navbar.js
  // const handleLogout = async () => { ... };

  const handleDateClick = (day) => {
    if (day) {
      setSelectedDate(new Date(currentYear, currentMonth, day));
      setShowModal(true);
    }
  };

 const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    // Keep the refetch here if desired, or rely on Navbar navigation
    if (user) {
        fetchSessions(user.uid);
    }
 };


  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

   const renderCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = (firstDay + 6) % 7;
    let weeks = [[]];
    let currentWeekIndex = 0;

    for (let i = 0; i < adjustedFirstDay; i++) {
      weeks[currentWeekIndex].push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      weeks[currentWeekIndex].push(day);
      if (weeks[currentWeekIndex].length === 7) {
        weeks.push([]);
        currentWeekIndex++;
      }
    }

    return (
      <div className="calendar">
        <div className="month-header">
          <button onClick={handlePrevMonth}>❮</button>
          <h2>
            {new Date(currentYear, currentMonth).toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button onClick={handleNextMonth}>❯</button>
        </div>

        <div className="weekdays">
           {/* Corrected key usage */}
           {["M", "T", "W", "T", "F", "S", "S"].map((d, index) => (
             <div key={index} className="weekday">{d}</div>
           ))}
        </div>


        <div className="calendar-grid">
          {weeks.map((week, i) => (
            <div key={i} className="week">
              {week.map((day, j) => {
                if (!day) {
                  return <div key={j} className="empty-box" />;
                }
                const dateObj = new Date(currentYear, currentMonth, day);
                const isoDate = formatDate(dateObj);
                 // Ensure user state is available before constructing docId
                 const docId = user ? `${user.uid}_${isoDate}` : `noUser_${isoDate}`;
                const sessionDoc = sessionsByDocId[docId];
                const sessionList = sessionDoc?.sessions || [];

                return (
                  <button
                    key={j}
                    type="button"
                    className="day-box"
                    onClick={() => handleDateClick(day)}
                  >
                    {day}
                    {sessionList.map((sess, idx) => (
                      <div key={idx} className="workout-label">
                        {sess.label}
                      </div>
                    ))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };


  // Ensure user is loaded before rendering dashboard content
  if (!user) {
     return <div>Loading...</div>; // Or a spinner component
  }


  return (
    <div className="dashboard">
      {/* Add the Navbar here */}
      <Navbar />

      {/* Remove the old logout button */}
      {/* <button onClick={handleLogout}>Logout</button> */}

      {renderCalendar()}

      {showModal && selectedDate && (
        <div className="modal">
          <div className="modal-content">
             {/* Ensure user.uid is passed */}
            <h3>Workout for {selectedDate.toDateString()}</h3>
            <WorkoutSession
              userId={user.uid}
              date={formatDate(selectedDate)}
              onSessionsChange={updateSessionsForDate}
            />
            <button onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;