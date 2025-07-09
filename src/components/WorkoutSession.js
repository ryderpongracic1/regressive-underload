import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import SessionForm from "./SessionForm";

function WorkoutSession({ userId, date, onSessionsChange }) {
  const [sessions, setSessions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  // If editingSessionIndex is null, we're in "add" mode; otherwise we're editing a session.
  const [editingSessionIndex, setEditingSessionIndex] = useState(null);

  const fetchData = useCallback(async () => {
    const docRef = doc(db, "sessions", `${userId}_${date}`);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      setSessions(data.sessions || []);
    } else {
      setSessions([]);
    }
  }, [userId, date]);

  useEffect(() => {
    if (userId && date) {
      fetchData();
    }
  }, [userId, date, fetchData]);

  const saveSessionsToFirestore = async (newSessions) => {
    // ADD THIS LOG: Check the userId right before constructing the docRef
    console.log(`saveSessionsToFirestore: Using userId='${userId}', date='${date}'`);

    if (!userId || !date) {
      console.error("Save aborted: Missing userId or date.");
      alert("Error: Could not save session. Missing user ID or date.");
      return;
    }

    const docRef = doc(db, "sessions", `${userId}_${date}`);
    console.log("Attempting to save to Firestore:", { userId, date, sessions: newSessions });
    try {
      await setDoc(docRef, {
        userId, // This userId MUST match the logged-in user's UID
        date,
        sessions: newSessions,
      });
      console.log("Firestore save successful for date:", date);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      alert(`Error saving workout: ${error.message}`);
    }
  };

  const handleSaveSession = async (sessionObj) => {
    let updatedSessions;
    if (editingSessionIndex !== null) {
      // Update existing session.
      updatedSessions = sessions.map((sess, idx) =>
        idx === editingSessionIndex ? sessionObj : sess
      );
    } else {
      // Add new session.
      updatedSessions = [...sessions, sessionObj];
    }
    setSessions(updatedSessions);
    await saveSessionsToFirestore(updatedSessions);
    if (onSessionsChange) {
      onSessionsChange(date, updatedSessions);
    }
    setShowForm(false);
    setEditingSessionIndex(null);
  };

  const handleDeleteSession = async (index) => {
    const updatedSessions = sessions.filter((_, i) => i !== index);
    setSessions(updatedSessions);
    await saveSessionsToFirestore(updatedSessions);
    if (onSessionsChange) {
      onSessionsChange(date, updatedSessions);
    }
  };

  const handleEditSession = (index) => {
    setEditingSessionIndex(index);
    setShowForm(true);
  };

  return (
    <div>
      {sessions.length > 0 &&
        sessions.map((sess, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "8px",
            }}
          >
            <h4>{sess.label}</h4>
            {sess.exercises && sess.exercises.length > 0 ? (
              sess.exercises.map((ex, exIndex) => (
                <div key={exIndex} style={{ marginLeft: "1rem" }}>
                  <strong>{ex.name}</strong>
                  {ex.sets &&
                    ex.sets.map((s, sIndex) => (
                      <div key={sIndex}>
                        Weight: {s.weight} | Reps: {s.reps}
                      </div>
                    ))}
                </div>
              ))
            ) : (
              <p style={{ marginLeft: "1rem" }}>No exercises.</p>
            )}
            <button
              style={{ marginTop: "10px", marginRight: "10px" }}
              onClick={() => handleEditSession(i)}
            >
              Edit Session
            </button>
            <button style={{ marginTop: "10px" }} onClick={() => handleDeleteSession(i)}>
              Delete Session
            </button>
          </div>
        ))}
      <button
        onClick={() => {
          setEditingSessionIndex(null);
          setShowForm(!showForm);
        }}
      >
        {showForm ? "Cancel" : "Add Session"}
      </button>
      {showForm && (
        <SessionForm
          session={editingSessionIndex !== null ? sessions[editingSessionIndex] : null}
          onSaveSession={handleSaveSession}
          onCancel={() => {
            setShowForm(false);
            setEditingSessionIndex(null);
          }}
        />
      )}
    </div>
  );
}

export default WorkoutSession;
