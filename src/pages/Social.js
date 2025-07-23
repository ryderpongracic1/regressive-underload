// src/pages/Social.js
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import Navbar from '../components/Navbar.js';
import '../styles/Social.css';

const forums = {
  'gym': { name: 'Gym Related', description: 'Discuss workouts, nutrition, and progress.' },
  'unrelated': { name: 'The Lounge', description: 'Talk about anything else on your mind.' }
};

function Social() {
  const [view, setView] = useState('index'); // 'index', 'forum', 'thread'
  const [selectedForum, setSelectedForum] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threads, setThreads] = useState([]);
  const [replies, setReplies] = useState([]);
  const [newThreadData, setNewThreadData] = useState({ title: '', content: '' });
  const [newReplyContent, setNewReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const user = auth.currentUser;

  // Fetch threads when a forum is selected
  useEffect(() => {
    if (view !== 'forum' || !selectedForum) return;
    
    setLoading(true);
    const threadsQuery = query(
      collection(db, 'threads'),
      where('forumId', '==', selectedForum),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(threadsQuery, (snapshot) => {
      setThreads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching threads:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [view, selectedForum]);

  // Fetch replies when a thread is selected
  useEffect(() => {
    if (view !== 'thread' || !selectedThread) return;
    
    setLoading(true);
    const repliesQuery = query(
      collection(db, `threads/${selectedThread.id}/replies`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(repliesQuery, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching replies:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [view, selectedThread]);

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThreadData.title.trim() || !newThreadData.content.trim() || !user) return;

    await addDoc(collection(db, 'threads'), {
      ...newThreadData,
      forumId: selectedForum,
      userId: user.uid,
      displayName: user.displayName || 'Anonymous',
      avatar: user.photoURL || '/default.png',
      replyCount: 0,
      timestamp: serverTimestamp()
    });
    setNewThreadData({ title: '', content: '' });
    setShowCreate(false);
  };

  const handleCreateReply = async (e) => {
    e.preventDefault();
    if (!newReplyContent.trim() || !user) return;

    const threadRef = doc(db, 'threads', selectedThread.id);
    const repliesColRef = collection(threadRef, 'replies');

    try {
      // Add the new reply document to Firestore
      await addDoc(repliesColRef, {
        content: newReplyContent,
        userId: user.uid,
        displayName: user.displayName,
        avatar: user.photoURL || '/default.png',
        timestamp: serverTimestamp()
      });

      // Update the reply count on the parent thread in a transaction
      await runTransaction(db, async (transaction) => {
        const threadDoc = await transaction.get(threadRef);
        if (!threadDoc.exists()) {
            throw new Error("Thread does not exist!");
        }
        const newReplyCount = (threadDoc.data().replyCount || 0) + 1;
        transaction.update(threadRef, { replyCount: newReplyCount });
      });

    } catch (error) {
      console.error("Error creating reply:", error);
      // Optionally, show an error message to the user
    } finally {
      // This block will always run, ensuring the input is cleared.
      setNewReplyContent('');
    }
  };
  
  const renderContent = () => {
    if (view === 'thread') {
      return (
        <div>
          <button onClick={() => setView('forum')} className="back-button">&larr; Back to {forums[selectedForum]?.name}</button>
          <div className="thread-header">
            <h1>{selectedThread.title}</h1>
          </div>

          <div className="post-container">
            <div className="post-header">
              <img src={selectedThread.avatar} alt="avatar" className="post-avatar"/>
              <span className="post-author">{selectedThread.displayName}</span>
            </div>
            <p className="post-content">{selectedThread.content}</p>
          </div>

          <h3>Replies</h3>
          {loading ? <p>Loading replies...</p> : replies.map(reply => (
            <div key={reply.id} className="post-container">
              <div className="post-header">
                <img src={reply.avatar} alt="avatar" className="post-avatar"/>
                <span className="post-author">{reply.displayName}</span>
              </div>
              <p className="post-content">{reply.content}</p>
            </div>
          ))}

          <form onSubmit={handleCreateReply} className="reply-form">
            <h4>Leave a Reply</h4>
            <textarea 
              value={newReplyContent}
              onChange={(e) => setNewReplyContent(e.target.value)}
              placeholder="Write your reply here..."
            />
            <button type="submit">Submit Reply</button>
          </form>
        </div>
      );
    }
    
    if (view === 'forum') {
      return (
        <div>
          <button onClick={() => setView('index')} className="back-button">&larr; Back to Forums</button>
          <h2 className="forum-header">{forums[selectedForum]?.name}</h2>
          <button onClick={() => setShowCreate(!showCreate)} className="new-thread-button">
            {showCreate ? 'Cancel' : 'Create New Thread'}
          </button>
          
          {showCreate && (
            <form onSubmit={handleCreateThread} className="post-form">
              <input type="text" placeholder="Thread Title" value={newThreadData.title} onChange={(e) => setNewThreadData({ ...newThreadData, title: e.target.value })} required />
              <textarea placeholder="What's on your mind?" value={newThreadData.content} onChange={(e) => setNewThreadData({ ...newThreadData, content: e.target.value })} required />
              <button type="submit">Post Thread</button>
            </form>
          )}

          {loading ? <p>Loading threads...</p> : threads.map(thread => (
            <div key={thread.id} className="thread-item" onClick={() => setSelectedThread(thread) & setView('thread')}>
              <div className="thread-details">
                <h3>{thread.title}</h3>
                <p>by {thread.displayName} &bull; {thread.replyCount || 0} replies</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="forum-grid">
        {Object.entries(forums).map(([id, { name, description }]) => (
          <div key={id} className="forum-category">
            <h2 className="category-title">{name}</h2>
            <div className="forum-item" onClick={() => setSelectedForum(id) & setView('forum')}>
              {/* Fixed the accessible-emoji warning */}
              <span role="img" aria-label="chat bubble" className="forum-icon">💬</span>
              <div className="forum-details">
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="forum-container">
        {renderContent()}
      </main>
    </div>
  );
}

export default Social;