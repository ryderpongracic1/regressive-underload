// src/components/AddExerciseModal.js
import React, { useState, useEffect } from 'react'; // Added useEffect here
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig"; // Assuming db & auth are exported here

// Basic Modal Styling (consider moving to CSS)
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000, // Ensure it's on top
};

const modalContentStyle = {
  background: 'white',
  padding: '20px 30px',
  borderRadius: '8px',
  minWidth: '300px',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
};

const inputStyle = {
  display: 'block',
  width: '95%', // Adjust as needed
  padding: '8px',
  marginBottom: '10px',
  border: '1px solid #ccc',
  borderRadius: '4px'
};

const buttonStyle = {
  padding: '10px 15px',
  marginRight: '10px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

// Make sure props are destructured correctly
function AddExerciseModal({ isOpen, onClose, onExerciseAdded, initialValue = "" }) {
  const [exerciseName, setExerciseName] = useState(initialValue);
  const [muscles, setMuscles] = useState(''); // Simple comma-separated string for now
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Update name if initialValue changes (when modal opens with prefilled value)
  useEffect(() => {
      setExerciseName(initialValue);
  }, [initialValue]); // Correct dependency array

  // Don't render anything if the modal is not open
  if (!isOpen) {
      return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedName = exerciseName.trim();
    const user = auth.currentUser;

    if (!user) {
      setError("You must be logged in to add exercises.");
      return;
    }
    if (!trimmedName) {
      setError("Exercise name cannot be empty.");
      return;
    }

    setIsSaving(true);
    // Split muscles string into an array, trim whitespace, remove empty strings
    const muscleArray = muscles.split(',')
                               .map(m => m.trim())
                               .filter(m => m !== '');

    try {
      const docRef = await addDoc(collection(db, "userExercises"), {
        name: trimmedName,
        muscles: muscleArray,
        userId: user.uid,
        isCustom: true
      });
      console.log("Custom exercise added with ID: ", docRef.id);
      // Pass the newly created exercise option back to the parent
      onExerciseAdded({ value: `custom_${docRef.id}`, label: trimmedName, source: 'custom' });
      handleClose(); // Close modal on success
    } catch (err) {
      console.error("Error adding custom exercise: ", err);
      setError("Failed to save exercise. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // handleClose resets state and calls the onClose prop from the parent
  const handleClose = () => {
      setExerciseName(""); // Reset state on close
      setMuscles("");
      setError("");
      setIsSaving(false);
      onClose(); // Call parent's close handler
  };

  // Render the modal structure
  return (
    <div style={modalOverlayStyle} onClick={handleClose}> {/* Close on overlay click */}
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}> {/* Prevent closing when clicking inside content */}
        <h2>Add Custom Exercise</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="exerciseNameModal">Exercise Name:</label> {/* Changed id to avoid conflict */}
          <input
            type="text"
            id="exerciseNameModal"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            style={inputStyle}
            required
            autoFocus // Focus the input when modal opens
          />

          <label htmlFor="musclesModal">Target Muscles (optional, comma-separated):</label> {/* Changed id */}
          <input
            type="text"
            id="musclesModal"
            value={muscles}
            onChange={(e) => setMuscles(e.target.value)}
            placeholder="e.g., Quads, Glutes, Biceps"
            style={inputStyle}
          />

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}> {/* Align buttons to the right */}
            <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                style={{ ...buttonStyle, backgroundColor: '#ccc' }}
            >
              Cancel
            </button>
             <button
                type="submit"
                disabled={isSaving}
                style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: 'white' }}
            >
              {isSaving ? 'Saving...' : 'Save Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddExerciseModal;