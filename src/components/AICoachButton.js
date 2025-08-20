import React, { useState } from 'react';
import AICoachModal from './AICoachModal';
import '../styles/AICoach.css';

function AICoachButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <button onClick={openModal} className="ai-coach-button">
        AI Coach
      </button>
      <AICoachModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}

export default AICoachButton;