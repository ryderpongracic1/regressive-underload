// src/pages/Statistics.js
import React, { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebaseConfig";
import Navbar from "../components/Navbar";
import Select from 'react-select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import "../styles/Statistics.css";

// Brzycki formula for e1RM. A simple and common way to estimate 1-rep max.
const calculateE1RM = (weight, reps) => {
  if (reps === 0) return 0;
  if (reps === 1) return weight;
  // Formula is not reliable for > 10 reps, but we'll cap it for consistency.
  const repsForCalc = Math.min(reps, 10);
  return weight / (1.0278 - 0.0278 * repsForCalc);
};

// Custom Tooltip for the Progress Chart
const CustomProgressTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="label">{`Date: ${label}`}</p>
        <p className="intro">{`Est. 1-Rep Max: ${Math.round(data.e1RM)} lbs`}</p>
        <p className="desc">{`Best Set: ${data.weight} lbs x ${data.reps} reps`}</p>
      </div>
    );
  }
  return null;
};


function Statistics() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [exerciseDetails, setExerciseDetails] = useState(new Map());
  const [timeframe, setTimeframe] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uniqueExercises, setUniqueExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const fetchExerciseDetails = useCallback(async (userId) => {
    const detailsMap = new Map();

    // 1. Fetch Custom Exercises
    const customExRef = collection(db, "userExercises");
    const q = query(customExRef, where("userId", "==", userId));
    const customSnapshot = await getDocs(q);
    customSnapshot.forEach(doc => {
        const data = doc.data();
        detailsMap.set(data.name, data.muscles || []);
    });

    // 2. Fetch API Exercises
    const apiKey = process.env.REACT_APP_RAPIDAPI_KEY;
    const apiHost = process.env.REACT_APP_RAPIDAPI_HOST;
    if (apiKey && apiHost) {
        const url = `https://${apiHost}/exercises?limit=0`;
        const options = {
            method: 'GET',
            headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost }
        };
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    data.forEach(ex => {
                        const muscles = ex.target ? [ex.target] : [];
                        if (!detailsMap.has(ex.name)) {
                            detailsMap.set(ex.name, muscles);
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch API exercises for details:", error);
        }
    }
    
    setExerciseDetails(detailsMap);
  }, []);

  // Authenticate user and fetch data on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchSessions(currentUser.uid);
        fetchExerciseDetails(currentUser.uid);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchExerciseDetails]);

  // Filter sessions whenever the raw session data or the timeframe changes
  useEffect(() => {
    if (sessions.length > 0) {
      const now = new Date();
      const filtered = sessions.filter((session) => {
        const sessionDate = new Date(session.date);
        if (timeframe === "7days") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return sessionDate >= sevenDaysAgo;
        }
        if (timeframe === "30days") {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return sessionDate >= thirtyDaysAgo;
        }
        return true; // 'all' timeframe
      });
      setFilteredSessions(filtered);
    } else {
      setFilteredSessions([]);
    }
  }, [sessions, timeframe]);
  
  // Update the list of available exercises when the timeframe changes
  useEffect(() => {
    const exercisesInTimeframe = new Set();
    filteredSessions.forEach(sessionDoc => {
      sessionDoc.sessions.forEach(sess => {
        sess.exercises.forEach(ex => {
          exercisesInTimeframe.add(ex.name);
        });
      });
    });
    const newUniqueExercises = Array.from(exercisesInTimeframe).sort().map(exName => ({ value: exName, label: exName }));
    setUniqueExercises(newUniqueExercises);

    // If the currently selected exercise is not in the new list, clear it
    if (selectedExercise && !exercisesInTimeframe.has(selectedExercise.value)) {
      setSelectedExercise(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSessions]);


  // Fetches all workout sessions for the given user ID from Firestore
  const fetchSessions = async (userId) => {
    setLoading(true);
    try {
      const sessionsRef = collection(db, "sessions");
      const q = query(sessionsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const fetchedSessions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSessions(fetchedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Data Processing for Charts ---

  const getVolumeData = () => {
    if (!filteredSessions.length) return [];
    return filteredSessions
      .map((session) => {
        const totalVolume = session.sessions.reduce((total, sess) => total + sess.exercises.reduce((exTotal, ex) => exTotal + ex.sets.reduce((setTotal, s) => setTotal + s.weight * s.reps, 0), 0), 0);
        return { date: session.date, volume: totalVolume };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getSessionFrequencyData = () => {
    if (!filteredSessions.length) return [];
    const frequency = filteredSessions.reduce((acc, session) => {
      session.sessions.forEach((sess) => {
        acc[sess.label] = (acc[sess.label] || 0) + 1;
      });
      return acc;
    }, {});
    return Object.keys(frequency).map((key) => ({ name: key, count: frequency[key] }));
  };

  const getMuscleGroupFrequencyData = () => {
    if (!filteredSessions.length || exerciseDetails.size === 0) return [];
    const frequency = {};

    filteredSessions.forEach(session => {
        session.sessions.forEach(sess => {
            sess.exercises.forEach(ex => {
                const muscles = exerciseDetails.get(ex.name);
                if (muscles && Array.isArray(muscles)) {
                    muscles.forEach(muscle => {
                        const formattedMuscle = muscle.charAt(0).toUpperCase() + muscle.slice(1);
                        frequency[formattedMuscle] = (frequency[formattedMuscle] || 0) + 1;
                    });
                }
            });
        });
    });

    return Object.keys(frequency).map(key => ({ name: key, count: frequency[key] })).sort((a,b) => b.count - a.count);
  };

  const getExerciseFrequencyData = () => {
    if (!filteredSessions.length) return [];
    const frequency = filteredSessions.reduce((acc, session) => {
      session.sessions.forEach((sess) => {
        sess.exercises.forEach((ex) => {
          acc[ex.name] = (acc[ex.name] || 0) + 1;
        });
      });
      return acc;
    }, {});
    return Object.keys(frequency).map((key) => ({ name: key, count: frequency[key] }));
  };

  const getExerciseProgressData = () => {
    if (!selectedExercise || !filteredSessions.length) return [];
    const progressData = {}; // Key: date, Value: { e1RM, weight, reps }
  
    filteredSessions.forEach(session => {
      session.sessions.forEach(sess => {
        sess.exercises.forEach(ex => {
          if (ex.name === selectedExercise.value) {
            let bestSetForDay = { e1RM: 0, weight: 0, reps: 0 };
            ex.sets.forEach(currentSet => {
              const e1RM = calculateE1RM(currentSet.weight, currentSet.reps);
              if (e1RM > bestSetForDay.e1RM) {
                bestSetForDay = { e1RM, weight: currentSet.weight, reps: currentSet.reps };
              }
            });
            if (bestSetForDay.e1RM > (progressData[session.date]?.e1RM || 0)) {
              progressData[session.date] = bestSetForDay;
            }
          }
        });
      });
    });
  
    return Object.keys(progressData)
      .map(date => ({
        date,
        e1RM: progressData[date].e1RM,
        weight: progressData[date].weight,
        reps: progressData[date].reps,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560", "#775DD0"];

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading-container"><p>Loading statistics...</p></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="loading-container"><p>Please log in to view your statistics.</p></div>
      </div>
    );
  }

  const volumeData = getVolumeData();
  const sessionFrequencyData = getSessionFrequencyData();
  const muscleGroupFrequencyData = getMuscleGroupFrequencyData();
  const exerciseFrequencyData = getExerciseFrequencyData();
  const exerciseProgressData = getExerciseProgressData();

  return (
    <div>
      <Navbar />
      <div className="stats-container">
        <h1>Your Statistics</h1>
        <div className="timeframe-selector">
          <button className={timeframe === "7days" ? "active" : ""} onClick={() => setTimeframe("7days")}>Last 7 Days</button>
          <button className={timeframe === "30days" ? "active" : ""} onClick={() => setTimeframe("30days")}>Last 30 Days</button>
          <button className={timeframe === "all" ? "active" : ""} onClick={() => setTimeframe("all")}>All Time</button>
        </div>

        {sessions.length === 0 ? (
          <p className="no-data-message">No workout data found. Add a workout on the dashboard to see your stats!</p>
        ) : (
          <div className="stats-grid">
            <div className="chart-card full-width-card">
              <h2>Progressive Overload Tracker</h2>
              <div className="exercise-selector">
                <Select
                  options={uniqueExercises}
                  onChange={setSelectedExercise}
                  value={selectedExercise}
                  placeholder="Select an exercise to see progress..."
                  isClearable
                />
              </div>
              {selectedExercise && exerciseProgressData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={exerciseProgressData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      dataKey="e1RM" 
                      domain={['dataMin - 10', 'dataMax + 10']} 
                      label={{ value: 'Est. 1-Rep Max (lbs)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(tick) => Math.round(tick)}
                    />
                    <Tooltip content={<CustomProgressTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="e1RM" name="Est. 1-Rep Max" stroke="#ff7300" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {selectedExercise && exerciseProgressData.length === 0 && (
                <p className="no-data-message">No data for this exercise in the selected timeframe.</p>
              )}
            </div>
            
            <div className="chart-card">
              <h2>Total Volume Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={volumeData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    label={{ value: 'Total Volume (lbs)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(tick) => Math.round(tick)}
                  />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="volume" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h2>Muscle Group Frequency</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={muscleGroupFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Times Trained" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h2>Session Frequency</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sessionFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h2>Muscle Group Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={muscleGroupFrequencyData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="count" nameKey="name" label={(entry) => entry.name}>
                    {muscleGroupFrequencyData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h2>Exercise Frequency</h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={exerciseFrequencyData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  <Radar name="Frequency" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default Statistics;
