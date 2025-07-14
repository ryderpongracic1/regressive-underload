// src/components/SessionForm.js
import React, { useState, useEffect, useCallback, memo } from "react";
import Select, { components } from 'react-select';
import { db, auth } from "../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AddExerciseModal from './AddExerciseModal';
import '../styles/SessionForm.css';

// --- Helper & Custom Select Components (Defined outside SessionForm) ---
// Star SVG for the favorite button
const StarIcon = ({ isFavorite }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={isFavorite ? "#ffc107" : "none"}
    stroke={isFavorite ? "#ffc107" : "#ccc"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="favorite-star"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

// Custom Option component, memoized for performance
const Option = memo((props) => {
  const { toggleFavorite } = props.selectProps;
  return (
    <div className="select-option-container">
      <components.Option {...props} />
      <span
        className="favorite-icon"
        onClick={(e) => {
          e.stopPropagation(); // Prevent the option from being selected
          toggleFavorite(props.data);
        }}
      >
        <StarIcon isFavorite={props.data.isFavorite} />
      </span>
    </div>
  );
});

// Custom NoOptionsMessage component, memoized for performance
const NoOptionsMessage = memo(props => {
  const { inputValue, exerciseIndex, openAddExerciseModal } = props.selectProps;
  return (
    <components.NoOptionsMessage {...props}>
      {inputValue ? (
        <button
          type="button"
          className="add-exercise-button-in-select"
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent dropdown from closing
            openAddExerciseModal(exerciseIndex, inputValue);
          }}
        >
          + Add "{inputValue}"
        </button>
      ) : ("Type to search or add a new exercise.")}
    </components.NoOptionsMessage>
  );
});

// --- Main SessionForm Component ---
function SessionForm({ session, onSaveSession, onCancel }) {
  // --- State ---
  const [label, setLabel] = useState("");
  const [exercises, setExercises] = useState([{ name: "", sets: [{ weight: "", reps: "" }] }]);
  const [rawExerciseOptions, setRawExerciseOptions] = useState([]);
  const [exerciseOptions, setExerciseOptions] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentInputExerciseName, setCurrentInputExerciseName] = useState("");
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(null);

  // --- Data Fetching and Processing ---
  const fetchAndProcessExercises = useCallback(async (userId) => {
    setIsLoading(true);
    setFetchError(null);

    const fetchApiExercises = async () => {
      const apiKey = process.env.REACT_APP_RAPIDAPI_KEY;
      const apiHost = process.env.REACT_APP_RAPIDAPI_HOST;
      if (!apiKey || !apiHost) return [];
      const url = `https://${apiHost}/exercises?limit=0`;
      const options = { method: 'GET', headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost } };
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`API Error ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data.map(ex => ({ value: `api_${ex.id}`, label: ex.name, source: 'api' })) : [];
      } catch (err) {
        console.error("Failed fetching API exercises:", err);
        setFetchError("Failed to connect to exercise API.");
        return [];
      }
    };

    const fetchCustomExercises = async (uid) => {
      if (!uid) return [];
      try {
        const q = query(collection(db, "userExercises"), where("userId", "==", uid));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ value: `custom_${d.id}`, label: d.data().name, source: 'custom' }));
      } catch (err) {
        console.error("Failed fetching custom exercises:", err);
        setFetchError("Failed to load custom exercises.");
        return [];
      }
    };

    const fetchFavorites = async (uid) => {
      if (!uid) return new Set();
      try {
        const favRef = doc(db, "userFavorites", uid);
        const favSnap = await getDoc(favRef);
        return favSnap.exists() ? new Set(favSnap.data().exercises || []) : new Set();
      } catch (error) {
        console.error("Error fetching favorites:", error);
        return new Set();
      }
    };

    try {
      const [favs, apiResults, customResults] = await Promise.all([
        fetchFavorites(userId),
        fetchApiExercises(),
        fetchCustomExercises(userId)
      ]);
      const combinedOptions = [...customResults];
      const customLabels = new Set(customResults.map(opt => opt.label));
      apiResults.forEach(apiOpt => { if (!customLabels.has(apiOpt.label)) { combinedOptions.push(apiOpt); } });
      setRawExerciseOptions(combinedOptions);
      setFavorites(favs);
    } catch (error) {
      console.error('Error refreshing exercises:', error);
      setFetchError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchAndProcessExercises(user.uid);
      } else {
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, [fetchAndProcessExercises]);

  // Re-sort display options when raw list or favorites change
  useEffect(() => {
    const sortedOptions = rawExerciseOptions
      .map(opt => ({
        ...opt,
        isFavorite: favorites.has(opt.value)
      }))
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.label.localeCompare(b.label);
      });
    setExerciseOptions(sortedOptions);
  }, [rawExerciseOptions, favorites]);

  // Initialize form state
  useEffect(() => {
    if (session) {
      setLabel(session.label || "");
      setExercises(session.exercises || [{ name: "", sets: [{ weight: "", reps: "" }] }]);
    } else {
      setLabel("");
      setExercises([{ name: "", sets: [{ weight: "", reps: "" }] }]);
    }
  }, [session]);

  // --- Handlers ---
  const toggleFavorite = useCallback((exerciseOption) => {
    if (!currentUser) return;
    setFavorites(currentFavorites => {
      const newFavorites = new Set(currentFavorites);
      if (newFavorites.has(exerciseOption.value)) {
        newFavorites.delete(exerciseOption.value);
      } else {
        newFavorites.add(exerciseOption.value);
      }
      // Save to Firestore optimistically
      const favRef = doc(db, "userFavorites", currentUser.uid);
      setDoc(favRef, { exercises: Array.from(newFavorites) }).catch(error => {
        console.error("Error updating favorites, reverting UI:", error);
        // On failure, revert to the pre-click state
        setFavorites(currentFavorites);
      });
      return newFavorites; // Return new set for immediate UI update
    });
  }, [currentUser]);

  const openAddExerciseModal = useCallback((index, inputValue) => {
    setCurrentInputExerciseName(inputValue);
    setActiveExerciseIndex(index);
    setIsModalOpen(true);
  }, []);

  const closeAddExerciseModal = () => {
    setIsModalOpen(false);
    setCurrentInputExerciseName("");
    setActiveExerciseIndex(null);
  };

  const handleExerciseAdded = (newExerciseOption) => {
    if (currentUser) {
      fetchAndProcessExercises(currentUser.uid);
    }
    if (activeExerciseIndex !== null) {
      handleExerciseChange(activeExerciseIndex, newExerciseOption);
    }
  };

  const handleAddExercise = () => setExercises([...exercises, { name: "", sets: [{ weight: "", reps: "" }] }]);

  const handleRemoveExercise = (index) => {
    if (exercises.length > 1) setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index, selectedOption) => {
    const updated = [...exercises];
    updated[index].name = selectedOption ? selectedOption.label : "";
    updated[index].value = selectedOption ? selectedOption.value : "";
    setExercises(updated);
  };

  const handleAddSet = (exIndex) => {
    const updated = [...exercises];
    updated[exIndex].sets.push({ weight: "", reps: "" });
    setExercises(updated);
  };

  const handleRemoveSet = (exIndex, setIndex) => {
    const updated = [...exercises];
    if (updated[exIndex].sets.length > 1) {
      updated[exIndex].sets.splice(setIndex, 1);
      setExercises(updated);
    }
  };

  const handleSetChange = (exIndex, setIndex, field, value) => {
    const updated = [...exercises];
    updated[exIndex].sets[setIndex][field] = value;
    setExercises(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSession({ label, exercises });
  };

  // --- End Handlers ---

  return (
    <>
      <div className="session-form-container">
        <h3>{session ? "Edit Session" : "New Session"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Session Label: </label>
            <input
              type="text"
              placeholder="e.g. Legs, Push, Pull..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <h4>Exercises</h4>
          {exercises.map((exercise, exIndex) => (
            <div key={exIndex} className="exercise-block">
              <div className="exercise-select-row">
                <label>Exercise: </label>
                <Select
                  options={exerciseOptions}
                  isLoading={isLoading}
                  onChange={(selectedOption) => handleExerciseChange(exIndex, selectedOption)}
                  value={exerciseOptions.find(option => option.label === exercise.name) || null}
                  placeholder={isLoading ? "Loading..." : "Search or select..."}
                  isClearable
                  styles={{ container: (base) => ({ ...base, flexGrow: 1 }), menu: (base) => ({ ...base, zIndex: 5 }) }}
                  isDisabled={isLoading || !!fetchError}
                  exerciseIndex={exIndex}
                  toggleFavorite={toggleFavorite}
                  openAddExerciseModal={openAddExerciseModal}
                  components={{ Option, NoOptionsMessage }}
                />
                {exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(exIndex)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
              </div>
              {fetchError && exIndex === 0 && <p className="error-message">Error: {fetchError}</p>}
              <div>
                <h5>Sets</h5>
                {exercise.sets.map((setObj, setIndex) => (
                  <div key={setIndex} className="set-row">
                    <label>Set {setIndex + 1}:</label>
                    <input
                      type="number"
                      placeholder="Weight"
                      value={setObj.weight}
                      onChange={(e) => handleSetChange(exIndex, setIndex, "weight", e.target.value)}
                      className="set-input"
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="Reps"
                      value={setObj.reps}
                      onChange={(e) => handleSetChange(exIndex, setIndex, "reps", e.target.value)}
                      className="set-input"
                      min="1"
                    />
                    {exercise.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSet(exIndex, setIndex)}
                        className="remove-set-button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => handleAddSet(exIndex)} className="add-set-button">
                  + Add Set
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={handleAddExercise} className="add-exercise-button">
            + Add Another Exercise
          </button>
          <div className="form-actions">
            <button type="submit" className="save-button">Save Session</button>
            {onCancel && (
              <button type="button" onClick={onCancel} className="cancel-button"> Cancel </button>
            )}
          </div>
        </form>
      </div>
      <AddExerciseModal
        isOpen={isModalOpen}
        onClose={closeAddExerciseModal}
        onExerciseAdded={handleExerciseAdded}
        initialValue={currentInputExerciseName}
      />
    </>
  );
}

export default SessionForm;