// src/pages/Profile.js
import React, { useState, useEffect, useCallback } from 'react';
import { auth, db, storage } from '../firebaseConfig'; // Import storage
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import storage functions
import Navbar from '../components/Navbar';
import '../styles/Profile.css';

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false); // State for save button

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Settings State
  const [darkMode, setDarkMode] = useState(false);
  const [reminders, setReminders] = useState({
    enabled: false,
    frequency: 3,
    label: 'Time to hit the gym!',
    message: 'A little progress each day adds up to big results.',
  });

  const fetchUserData = useCallback(async (currentUser) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      setDisplayName(currentUser.displayName || '');
      setAvatarPreview(currentUser.photoURL || '/default.png');
      const profileRef = doc(db, 'users', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setBio(profileSnap.data().bio || '');
      }
      const settingsRef = doc(db, 'userSettings', currentUser.uid);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        setDarkMode(settingsData.darkMode || false);
        setReminders(prev => ({ ...prev, ...(settingsData.reminders || {}) }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserData(currentUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePFP = async () => {
    if (!user) return;

    // Optimistically update the UI
    setAvatarPreview('/default.png'); 
    setAvatar(null);

    try {
        await updateProfile(user, { photoURL: "" });
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { photoURL: "" }, { merge: true });
        
        // Reload user to get the latest profile info
        await auth.currentUser.reload();
        setUser(auth.currentUser);

    } catch (error) {
        console.error("Error removing profile picture:", error);
        // Revert UI on error
        setAvatarPreview(user.photoURL || '/default.png');
    }
  };

  const handleDarkModeChange = async (newDarkMode) => {
    setDarkMode(newDarkMode);
    if (user) {
        try {
            const settingsRef = doc(db, 'userSettings', user.uid);
            await setDoc(settingsRef, { darkMode: newDarkMode }, { merge: true });
        } catch (error) {
            console.error("Error saving dark mode setting:", error);
            // Optionally, revert the UI change and show an error message
            setDarkMode(!newDarkMode);
        }
    }
  };

  const handleRemindersChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newReminders = { ...reminders, [name]: type === 'checkbox' ? checked : value };
    setReminders(newReminders);
    if (user) {
        try {
            const settingsRef = doc(db, 'userSettings', user.uid);
            setDoc(settingsRef, { reminders: newReminders }, { merge: true });
        } catch (error) {
            console.error("Error saving reminders setting:", error);
            // Optionally, revert the UI change and show an error message
        }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setMessage('Starting save...');

    try {
      let photoURL = user.photoURL;

      // 1. Handle Avatar Upload if a new avatar is selected
      if (avatar) {
        setMessage('Uploading avatar...');
        const avatarRef = ref(storage, `avatars/${user.uid}/${avatar.name}`);
        const snapshot = await uploadBytes(avatarRef, avatar);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // 2. Update Firebase Auth profile
      setMessage('Updating profile...');
      await updateProfile(user, { displayName, photoURL });

      // 3. Update Firestore profile document
      setMessage('Saving details...');
      await setDoc(doc(db, 'users', user.uid), { bio, photoURL }, { merge: true });

      setMessage('Profile updated successfully!');
      await auth.currentUser.reload();
      setUser(auth.currentUser);

    } catch (error) {
      console.error("Error updating profile: ", error);
      setMessage(`Error: ${error.code || error.message}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 5000); // Keep message on screen longer
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="profile-container"><p>Loading Profile...</p></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar />
        <div className="profile-container"><p>Please log in to view your profile.</p></div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="profile-container">
        <h1>Profile & Settings</h1>
        <div className="profile-grid">
          <div className="profile-section card">
            <h2>Profile Information</h2>
            <div className="avatar-section">
              <img src={avatarPreview} alt="Avatar" className="avatar-preview" />
              <label htmlFor="avatar-upload" className="avatar-upload-label">Change Avatar</label>
              <input id="avatar-upload" type="file" onChange={handleAvatarChange} accept="image/*" disabled={isSaving} />
              <button onClick={handleRemovePFP} className="remove-pfp-button" disabled={isSaving}>Remove PFP</button>
            </div>
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your Name" />
            </div>
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself" rows="4"></textarea>
            </div>
          </div>
          <div className="settings-section card">
            <h2>Settings</h2>
            <div className="setting-item">
              <label htmlFor="darkMode">Dark Mode</label>
              <label className="switch">
                <input id="darkMode" type="checkbox" checked={darkMode} onChange={(e) => handleDarkModeChange(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-item">
              <label htmlFor="remindersEnabled">Email Reminders</label>
              <label className="switch">
                <input id="remindersEnabled" name="enabled" type="checkbox" checked={reminders.enabled} onChange={handleRemindersChange} />
                <span className="slider round"></span>
              </label>
            </div>
            {reminders.enabled && (
              <div className="reminder-options">
                <div className="form-group">
                  <label htmlFor="frequency">Remind me every</label>
                  <input id="frequency" name="frequency" type="number" value={reminders.frequency} onChange={handleRemindersChange} min="1" />
                  <span>days</span>
                </div>
                <div className="form-group">
                  <label htmlFor="label">Email Subject</label>
                  <input id="label" name="label" type="text" value={reminders.label} onChange={handleRemindersChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Inspirational Message</label>
                  <textarea id="message" name="message" value={reminders.message} onChange={handleRemindersChange} rows="3"></textarea>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="profile-actions">
          <button onClick={handleSave} className="save-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          {message && <p className="save-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default Profile;