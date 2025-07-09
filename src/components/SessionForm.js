// src/components/SessionForm.js
import React, { useState, useEffect, useCallback } from "react";
import Select, { components } from 'react-select'; // Ensure 'components' is imported
import { db, auth } from "../firebaseConfig";
// Removed unused 'addDoc' import from here (it's used in AddExerciseModal)
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AddExerciseModal from './AddExerciseModal';

function SessionForm({ session, onSaveSession, onCancel }) {
  // --- State ---
  const [label, setLabel] = useState("");
  const [exercises, setExercises] = useState([{ name: "", sets: [{ weight: "", reps: "" }] }]);
  const [exerciseOptions, setExerciseOptions] = useState([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentInputExerciseName, setCurrentInputExerciseName] = useState("");
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(null);
  // --- End State ---

  // Get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // --- Callback to refresh exercise options ---
  const refreshExerciseOptions = useCallback(async () => {
    // ... (Keep the full refreshExerciseOptions logic from the previous correct version) ...
    // Including the fetchApiExercises and fetchCustomExercises helpers inside it
    // with their internal try/catch blocks returning [] on error.
    console.log("refreshExerciseOptions called. currentUser:", currentUser);
    if (!currentUser) {
      console.log("No current user, setting empty options.");
      setExerciseOptions([]);
      setIsLoadingExercises(false);
      return;
    }
    setIsLoadingExercises(true);
    setFetchError(null);

    const fetchApiExercises = async () => {
      console.log("Attempting to fetch API exercises...");
      const apiKey = process.env.REACT_APP_RAPIDAPI_KEY;
      const apiHost = process.env.REACT_APP_RAPIDAPI_HOST;
      if (!apiKey || !apiHost) {
          console.error("API config missing for API exercises."); return [];
      }
      const url = `https://${apiHost}/exercises?limit=0`;
      const options = {
        method: 'GET',
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost }
      };
      try {
          const response = await fetch(url, options);
          console.log("API Response Status:", response.status);
          if (!response.ok) {
              const errorText = await response.text();
              console.error(`API Error ${response.status}: ${errorText}`);
              setFetchError(`API Error ${response.status}`); return [];
          }
          const data = await response.json();
          console.log("API Response Data:", data);
          if (!Array.isArray(data)) {
              console.error("API data is not an array:", data);
              setFetchError("Unexpected API response format."); return [];
          }
          return data.map(ex => ({ value: `api_${ex.id}`, label: ex.name, source: 'api' }));
      } catch (err) {
          console.error("Failed fetching API exercises:", err);
          setFetchError("Failed to connect to exercise API."); return [];
      }
    };

    const fetchCustomExercises = async (userId) => {
      console.log("Attempting to fetch custom exercises for userId:", userId);
      if (!userId) return [];
      try {
          const customExRef = collection(db, "userExercises");
          const q = query(customExRef, where("userId", "==", userId));
          const snapshot = await getDocs(q);
          console.log("Custom exercises snapshot size:", snapshot.size);
          return snapshot.docs.map(doc => ({ value: `custom_${doc.id}`, label: doc.data().name, source: 'custom' }));
      } catch (err) {
          console.error("Failed fetching custom exercises:", err);
          setFetchError("Failed to load custom exercises."); return [];
      }
    };

    try {
      const [apiResults, customResults] = await Promise.all([
        fetchApiExercises(),
        fetchCustomExercises(currentUser.uid)
      ]);
      console.log("API Fetch Results Count:", apiResults.length);
      console.log("Custom Fetch Results Count:", customResults.length);
      const combinedOptions = [...customResults];
      const customLabels = new Set(customResults.map(opt => opt.label));
      apiResults.forEach(apiOpt => { if (!customLabels.has(apiOpt.label)) { combinedOptions.push(apiOpt); } });
      combinedOptions.sort((a, b) => a.label.localeCompare(b.label));
      console.log("Combined Exercise Options Count:", combinedOptions.length);
      setExerciseOptions(combinedOptions);
      setFetchError(null);
    } catch (error) {
      console.error('Error in refreshExerciseOptions:', error);
      setFetchError("An unexpected error occurred while loading exercises.");
      setExerciseOptions([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [currentUser]);
  // --- End Refresh Callback ---

  // --- Fetch Combined Exercises (Initial Load) ---
  useEffect(() => {
    refreshExerciseOptions();
  }, [refreshExerciseOptions]);
  // --- End Fetch Combined Exercises ---

  // --- Initialize form state based on session prop ---
  useEffect(() => {
    // ... (Keep the full logic from the previous correct version) ...
    console.log("SessionForm useEffect triggered. Session prop:", session);
    if (session && session.exercises && Array.isArray(session.exercises)) {
      setLabel(session.label || "");
      const exercisesToEdit = session.exercises.map(ex => ({
        name: ex.name || "",
        sets: (ex.sets && Array.isArray(ex.sets)) ? ex.sets.map(s => ({
          weight: s.weight ?? "", reps: s.reps ?? ""
        })) : [{ weight: "", reps: "" }]
      }));
      console.log("Setting exercises state for editing:", exercisesToEdit);
      setExercises(exercisesToEdit);
    } else if (!session) {
       console.log("Resetting state for new session.");
       setLabel("");
       setExercises([{ name: "", sets: [{ weight: "", reps: "" }] }]);
    }
  }, [session]);
  // --- End Initialize form state ---

  // --- Modal Handling ---
  const openAddExerciseModal = (index, inputValue) => {
    setCurrentInputExerciseName(inputValue);
    setActiveExerciseIndex(index);
    setIsModalOpen(true); // This setIsModalOpen IS used now
  };

  const closeAddExerciseModal = () => {
    setIsModalOpen(false);
    setCurrentInputExerciseName("");
    setActiveExerciseIndex(null);
  };

  const handleExerciseAdded = (newExerciseOption) => {
    refreshExerciseOptions();
    if (activeExerciseIndex !== null) {
       handleExerciseChange(activeExerciseIndex, newExerciseOption);
    }
    // Consider closing modal here if not closed automatically by AddExerciseModal
    // closeAddExerciseModal();
  };
  // --- End Modal Handling ---

  // --- Handlers for Exercises/Sets ---
  const handleAddExercise = () => {
    setExercises([...exercises, { name: "", sets: [{ weight: "", reps: "" }] }]);
  };

  const handleRemoveExercise = (index) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index, selectedOption) => {
    const exerciseName = selectedOption ? selectedOption.label : "";
    const exerciseValue = selectedOption ? selectedOption.value : "";
    const updated = exercises.map((ex, i) =>
      i === index ? { ...ex, name: exerciseName, selectedValue: exerciseValue } : ex
    );
    setExercises(updated);
  };

  const handleAddSet = (exerciseIndex) => {
    const updated = exercises.map((ex, i) => {
      if (i === exerciseIndex) {
        const currentSets = ex.sets || [];
        return { ...ex, sets: [...currentSets, { weight: "", reps: "" }] };
      }
      return ex;
    });
    setExercises(updated);
  };

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const updated = exercises.map((ex, i) => {
      if (i === exerciseIndex) {
        const currentSets = ex.sets || [];
        if (currentSets.length <= 1) return ex;
        return { ...ex, sets: currentSets.filter((_, idx) => idx !== setIndex) };
      }
      return ex;
    });
    setExercises(updated);
  };

  const handleSetChange = (exerciseIndex, setIndex, field, value) => {
    const updated = exercises.map((ex, i) => {
      if (i === exerciseIndex) {
        const currentSets = ex.sets || [];
        const updatedSets = currentSets.map((s, sIdx) =>
          sIdx === setIndex ? { ...s, [field]: value } : s
        );
        return { ...ex, sets: updatedSets };
      }
      return ex;
    });
    setExercises(updated);
  };
  // --- End Handlers ---

  // --- Form Submission ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) { alert("Please enter a session label."); return; }
    for (let ex of exercises) {
      if (!ex.name) { alert("Please select an exercise for all entries."); return; }
      if (!ex.sets || ex.sets.length === 0) { alert(`Please add at least one set for ${ex.name}.`); return; }
      for (let s of ex.sets) {
        if (s.weight === "" || s.reps === "") { alert(`Please fill weight and reps in all sets for ${ex.name}.`); return; }
        if (isNaN(Number(s.weight)) || isNaN(Number(s.reps)) || Number(s.weight) < 0 || Number(s.reps) <= 0) { alert(`Please enter valid positive numbers for weight and reps for ${ex.name}.`); return; }
      }
    }
    const sessionObj = {
      label: label.trim(),
      exercises: exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets.map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
      })),
    };
    onSaveSession(sessionObj);
  };
  // --- End Form Submission ---

  // --- Custom Select Components ---
  // NoOptionsMessage component to show "+ Add" button
  const NoOptionsMessage = props => {
      const inputValue = props.selectProps.inputValue;
      return (
        // Use the default NoOptionsMessage component from react-select
        // and enhance its children
        <components.NoOptionsMessage {...props}>
           {inputValue ? (
                // Button to trigger adding a new exercise
                <button
                    type="button"
                    style={{ color: 'blue', background: 'none', border: 'none', padding: '5px', cursor: 'pointer', textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'left' }}
                    onMouseDown={(e) => { // Use onMouseDown to prevent blur issues
                         e.preventDefault();
                         const index = props.selectProps.exerciseIndex;
                         openAddExerciseModal(index, inputValue); // Call modal opener
                    }}
                >
                    + Add "{inputValue}" as new exercise?
                </button>
            ) : (
                // Default message when input is empty
                "No options - type to add a new exercise."
            ) }
        </components.NoOptionsMessage>
      );
  };
  // --- End Custom Select Components ---

  // --- JSX Rendering ---
  return (
    <> {/* Fragment */}
      <div
        className="session-form-container"
        // Re-added inline styles for container
        style={{
            marginTop: "1rem",
            maxHeight: "75vh",
            overflowY: "auto",
            paddingRight: "1rem",
            border: '1px solid #eee',
            padding: '15px',
            borderRadius: '8px'
        }}
      >
        <h3>{session ? "Edit Session" : "New Session"}</h3>
        <form onSubmit={handleSubmit}>
          {/* Session Label Input */}
          <div style={{ marginBottom: "1rem" }}>
              <label>Session Label: </label>
              <input
                type="text"
                placeholder="e.g. Legs, Push, Pull..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                // Re-added basic inline style
                style={{ marginLeft: '5px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
          </div>

          <h4>Exercises</h4>
          {exercises.map((exercise, exIndex) => (
            <div
              key={exIndex}
              // Re-added inline styles for exercise block
              style={{
                border: "1px solid #ccc",
                marginBottom: "15px",
                padding: "15px",
                borderRadius: "6px",
                backgroundColor: '#f9f9f9'
              }}
            >
              {/* Exercise Selection */}
              <div style={{ marginBottom: "10px", display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{flexShrink: 0}}>Exercise: </label>
                <Select
                  options={exerciseOptions}
                  isLoading={isLoadingExercises}
                  onChange={(selectedOption) => handleExerciseChange(exIndex, selectedOption)}
                  value={exerciseOptions.find(option => option.label === exercise.name) || null}
                  placeholder={isLoadingExercises ? "Loading..." : "Search or select..."}
                  isClearable
                  // Re-added inline styles for Select container
                  styles={{ container: (base) => ({...base, flexGrow: 1 }), menu: (base) => ({...base, zIndex: 5}) }}
                  isDisabled={isLoadingExercises || !!fetchError}
                  exerciseIndex={exIndex} // Pass index for modal context
                  components={{ NoOptionsMessage }} // Use the custom component HERE
                  // onInputChange removed as it wasn't strictly needed with the NoOptionsMessage approach
                />
                {/* Remove Exercise Button */}
                {exercises.length > 1 && (
                   <button
                      type="button"
                      onClick={() => handleRemoveExercise(exIndex)}
                      // Re-added inline styles
                      style={{ padding: '5px 8px', backgroundColor: '#fdd', border: '1px solid #fbb', cursor: 'pointer', borderRadius: '4px' }}
                   > Remove </button>
                 )}
              </div>
               {fetchError && exIndex === 0 && <p style={{color: 'red', fontSize: '0.8em'}}>Error: {fetchError}</p>}

              {/* Sets Section */}
              <div>
                <h5>Sets</h5>
                {exercise.sets && exercise.sets.map((setObj, setIndex) => (
                  <div
                    key={setIndex}
                    // Re-added inline styles for set row
                    style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: 'center' }}
                  >
                    <label>Set {setIndex + 1}:</label>
                    {/* Weight Input */}
                    <input
                      type="number"
                      placeholder="Weight"
                      value={setObj.weight}
                      onChange={(e) => handleSetChange(exIndex, setIndex, "weight", e.target.value)}
                      // Re-added inline styles
                      style={{ width: "80px", padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      min="0"
                    />
                    {/* Reps Input */}
                    <input
                      type="number"
                      placeholder="Reps"
                      value={setObj.reps}
                      onChange={(e) => handleSetChange(exIndex, setIndex, "reps", e.target.value)}
                      // Re-added inline styles
                      style={{ width: "60px", padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      min="1"
                    />
                    {/* Remove Set Button */}
                    {exercise.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSet(exIndex, setIndex)}
                        // Re-added inline styles
                        style={{ padding: '3px 6px', fontSize: '0.8em', backgroundColor: '#eee', border: '1px solid #ccc', cursor: 'pointer', borderRadius: '3px' }}
                      > ✕ </button>
                    )}
                  </div>
                ))}
                {/* Add Set Button */}
                <button
                    type="button"
                    onClick={() => handleAddSet(exIndex)}
                    // Re-added inline styles
                    style={{ padding: '5px 10px', fontSize: '0.9em', cursor: 'pointer', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                 > + Add Set </button>
              </div>
            </div> // End exercise item div
          ))}
          {/* Add Exercise Button */}
          <button
            type="button"
            onClick={handleAddExercise}
            // Re-added inline styles
            style={{ marginBottom: "1rem", padding: '8px 15px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f44336' }}
          > + Add Another Exercise </button>
          <br />
          {/* Form Action Buttons */}
           <div style={{marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end'}}>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Session</button>
                {onCancel && (
                  <button type="button" onClick={onCancel} style={{ marginLeft: "10px", padding: '10px 15px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}> Cancel </button>
                )}
           </div>
        </form>
      </div>

      {/* Render the Modal */}
      <AddExerciseModal
        isOpen={isModalOpen}
        onClose={closeAddExerciseModal}
        onExerciseAdded={handleExerciseAdded}
        initialValue={currentInputExerciseName}
      />
    </> // End Fragment
  );
  // --- End JSX Rendering ---
}

export default SessionForm;

