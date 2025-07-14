// src/pages/Dashboard.js
import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import WorkoutSession from "../components/WorkoutSession";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [sessionsByDocId, setSessionsByDocId] = useState({});
  const [restDays, setRestDays] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedDates, setHighlightedDates] = useState(new Set());
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const navigate = useNavigate();

  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = `0${d.getMonth() + 1}`.slice(-2);
    const day = `0${d.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  };

  const fetchDashboardData = useCallback(async (userId) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      // Fetch sessions
      const sessionsRef = collection(db, "sessions");
      const q = query(sessionsRef, where("userId", "==", userId));
      const sessionsSnapshot = await getDocs(q);
      const sessionsMap = {};
      sessionsSnapshot.forEach((docSnap) => {
        sessionsMap[docSnap.id] = docSnap.data();
      });
      setSessionsByDocId(sessionsMap);

      // Fetch rest days
      const restDaysRef = doc(db, "userRestDays", userId);
      const restDaysSnap = await getDoc(restDaysRef);
      if (restDaysSnap.exists()) {
        setRestDays(new Set(restDaysSnap.data().dates || []));
      } else {
        setRestDays(new Set());
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchDashboardData(currentUser.uid);
      } else {
        setLoading(false);
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate, fetchDashboardData]);

  // Effect for handling search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedDates(new Set());
      return;
    }
    const newHighlightedDates = new Set();
    const lowerCaseQuery = searchQuery.toLowerCase();
    for (const docId in sessionsByDocId) {
      const sessionDoc = sessionsByDocId[docId];
      let matchFound = false;
      if (sessionDoc.sessions && Array.isArray(sessionDoc.sessions)) {
        for (const sess of sessionDoc.sessions) {
          if (sess.label.toLowerCase().includes(lowerCaseQuery)) {
            matchFound = true;
            break;
          }
          if (sess.exercises && Array.isArray(sess.exercises)) {
            for (const ex of sess.exercises) {
              if (ex.name.toLowerCase().includes(lowerCaseQuery)) {
                matchFound = true;
                break;
              }
            }
          }
          if (matchFound) break;
        }
      }
      if (matchFound) {
        newHighlightedDates.add(sessionDoc.date);
      }
    }
    if ('rest days'.includes(lowerCaseQuery)) {
      restDays.forEach(date => newHighlightedDates.add(date));
    }

    setHighlightedDates(newHighlightedDates);
  }, [searchQuery, sessionsByDocId, restDays]); 

  const toggleRestDay = async (isoDate) => {
    if (!user) return;

    const docId = `${user.uid}_${isoDate}`;
    if (!restDays.has(isoDate) && sessionsByDocId[docId]?.sessions?.length > 0) {
      alert("Cannot mark a day with logged workouts as a rest day.");
      return;
    }

    // --- Optimistic Update ---
    // 1. Keep a copy of the original state to revert on error
    const originalRestDays = new Set(restDays);
    const newRestDays = new Set(originalRestDays);

    if (newRestDays.has(isoDate)) {
      newRestDays.delete(isoDate);
    } else {
      newRestDays.add(isoDate);
    }

    // 2. Update the UI immediately for instant feedback
    setRestDays(newRestDays);
    // --- End of Optimistic Update ---

    try {
      // 3. Attempt to save the change to Firestore
      const restDaysRef = doc(db, "userRestDays", user.uid);
      await setDoc(restDaysRef, { dates: Array.from(newRestDays) });
    } catch (error) {
      console.error("Error saving rest days:", error);
      // 4. If the save fails, revert the UI to its original state
      setRestDays(originalRestDays);
      alert("Failed to update rest day. Please check your connection and try again.");
    }
  };

  const updateSessionsForDate = async (isoDate, newSessions) => {
    if (!user?.uid) return;
    const docId = `${user.uid}_${isoDate}`;
    
    const newSessionData = {
      userId: user.uid,
      date: isoDate,
      sessions: newSessions,
    };

    try {
        const sessionDocRef = doc(db, "sessions", docId);
        await setDoc(sessionDocRef, newSessionData, { merge: true });

        setSessionsByDocId((prev) => ({
            ...prev,
            [docId]: newSessionData,
        }));
    
        if (restDays.has(isoDate)) {
            const newRestDays = new Set(restDays);
            newRestDays.delete(isoDate);
            const restDaysRef = doc(db, "userRestDays", user.uid);
            await setDoc(restDaysRef, { dates: Array.from(newRestDays) });
            setRestDays(newRestDays);
        }
    } catch (error) {
        console.error("Error updating session or rest day:", error);
        alert("Failed to save workout session. Please try again.");
    }
  };

  const handleDateClick = (day) => {
    if (day) {
      setSelectedDate(new Date(currentYear, currentMonth, day));
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = (firstDay === 0) ? 6 : firstDay - 1;
    let weeks = [[]];
    let currentWeekIndex = 0;

    for (let i = 0; i < adjustedFirstDay; i++) {
      weeks[currentWeekIndex].push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      if (weeks[currentWeekIndex].length === 7) {
        weeks.push([]);
        currentWeekIndex++;
      }
      weeks[currentWeekIndex].push(day);
    }

    return (
      <div className="calendar">
        <div className="month-header">
          <button onClick={handlePrevMonth}>❮</button>
          <h2>{new Date(currentYear, currentMonth).toLocaleString("default", { month: "long", year: "numeric" })}</h2>
          <button onClick={handleNextMonth}>❯</button>
        </div>
        <div className="weekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} className="weekday">{d}</div>)}
        </div>
        <div className="calendar-grid">
          {weeks.map((week, i) => (
            <div key={i} className="week">
              {week.map((day, j) => {
                if (!day) return <div key={j} className="empty-box" />;
                
                const dateObj = new Date(currentYear, currentMonth, day);
                const isoDate = formatDate(dateObj);
                const docId = user ? `${user.uid}_${isoDate}` : null;
                const hasWorkout = docId ? sessionsByDocId[docId]?.sessions?.length > 0 : false;
                const isRestDay = restDays.has(isoDate);
                const isSearching = searchQuery.trim().length > 0;

                let dayClass = "day-box";
                if (hasWorkout) dayClass += " day-with-workout";
                if (isRestDay) dayClass += " rest-day";
                
                if (isSearching) {
                  if (highlightedDates.has(isoDate)) {
                    dayClass += " highlighted-day";
                  } else {
                    dayClass += " dimmed-day";
                  }
                }

                return (
                  <button key={j} type="button" className={dayClass} onClick={() => handleDateClick(day)}>
                    <span>{day}</span>
                    {hasWorkout && sessionsByDocId[docId].sessions.map((sess, idx) => (
                      <div key={idx} className="workout-label">{sess.label}</div>
                    ))}
                    {isRestDay && !hasWorkout && <div className="workout-label rest-day-label">Rest</div>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div><Navbar /><div className="loading-container"><p>Loading Dashboard...</p></div></div>;
  }

  const selectedIsoDate = selectedDate ? formatDate(selectedDate) : null;
  const isSelectedRestDay = selectedIsoDate ? restDays.has(selectedIsoDate) : false;

  return (
    <div className="dashboard">
      <Navbar />
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search workouts by session or exercise..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {renderCalendar()}
      {showModal && selectedDate && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={handleCloseModal}>&times;</span>
            <h3>{isSelectedRestDay ? "Rest Day" : `Workout for ${selectedDate.toDateString()}`}</h3>
            
            {isSelectedRestDay ? (
              <p>This day is marked as a rest day.</p>
            ) : (
              <WorkoutSession
                userId={user.uid}
                date={selectedIsoDate}
                initialSessions={sessionsByDocId[`${user.uid}_${selectedIsoDate}`]?.sessions || []}
                onSessionsChange={updateSessionsForDate}
              />
            )}
            
            <div className="modal-actions">
              <button onClick={() => toggleRestDay(selectedIsoDate)}>
                {isSelectedRestDay ? "Unmark as Rest Day" : "Mark as Rest Day"}
              </button>
              <button onClick={handleCloseModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;