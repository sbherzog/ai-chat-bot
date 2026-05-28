import React from 'react';
import './ChatBotStart.css';

export default function ChatBotStart({ onStartChat, user, onSignOut }) {
  return (
    <div className="start-page">
      <div className="start-page-user">
        <span>{user?.email}</span>
        <button className="sign-out-btn" onClick={onSignOut}>Sign Out</button>
      </div>
      <button className="start-page-btn" onClick={onStartChat}>
        Chat AI
      </button>
    </div>
  );
}
