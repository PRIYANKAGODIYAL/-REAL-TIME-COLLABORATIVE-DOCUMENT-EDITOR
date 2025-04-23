// src/Home.jsx
import React from 'react';
import './Home.css';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    const newDocId = Date.now();
    navigate(`/documents/${newDocId}`);
  };

  return (
    <div className="home-container">
      <div className="overlay">
        <h1>Welcome to the Collaborative Editor</h1>
        <p>Create and share documents in real time with your team.</p>
        <button onClick={handleStart}>Create New Document</button>
      </div>
    </div>
  );
};

export default Home;
