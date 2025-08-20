import React, { useState, useMemo } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

function AICoachModal({ isOpen, onClose }) {
  // --- State Variables ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- AI Model Initialization ---
  // useMemo ensures the model is initialized only once
  const model = useMemo(() => {
    try {
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GOOGLE_AI_API_KEY);
      return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
      console.error("Failed to initialize GoogleGenerativeAI:", error);
      // Handle initialization error, maybe show an error message in the UI
      return null;
    }
  }, []);

  if (!isOpen) return null;

  // --- Event Handler ---
  const handleSend = async () => {
    if (!input.trim() || !model) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const result = await model.generateContent(currentInput);
      const response = await result.response;
      
      // ✨ FIX: Added 'await' to get the text from the response
      const text = await response.text(); 
      
      const aiResponse = text || "Sorry, I couldn't get a response.";
      setMessages(prevMessages => [...prevMessages, { text: aiResponse, sender: 'ai' }]);

    } catch (error) {
      console.error('Error fetching AI response:', error);
      setMessages(prevMessages => [...prevMessages, { text: 'Sorry, something went wrong.', sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX ---
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
              {msg.text.split('\n').map((line, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\* (.*)/g, '<li>$1</li>') }} />
              ))}
            </div>
          ))}
          {isLoading && <div className="ai-coach-message ai">Thinking...</div>}
        </div>
        <div className="ai-coach-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={model ? "Ask your AI coach..." : "AI model is not available."}
            disabled={isLoading || !model}
          />
          <button onClick={handleSend} disabled={isLoading || !model}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default AICoachModal;