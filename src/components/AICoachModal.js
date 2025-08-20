import React, { useState } from 'react';

function AICoachModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Step 1: Frontend calls your own backend proxy endpoint
      const response = await fetch('/api/aicoach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const aiResponse = data.text || "Sorry, I couldn't get a response.";

      // Step 2: Display the response from your backend
      setMessages(prevMessages => [...prevMessages, { text: aiResponse, sender: 'ai' }]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      setMessages(prevMessages => [...prevMessages, { text: 'Sorry, something went wrong.', sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-coach-modal-overlay" onClick={onClose}>
      <div className="ai-coach-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ai-coach-modal-header">
          <h2>AI Fitness Coach</h2>
          <button onClick={onClose} className="ai-coach-close-button">&times;</button>
        </div>
        <div className="ai-coach-chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`ai-coach-message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && <div className="ai-coach-message ai">Thinking...</div>}
        </div>
        <div className="ai-coach-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your AI coach anything..."
          />
          <button onClick={handleSend} disabled={isLoading}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default AICoachModal;