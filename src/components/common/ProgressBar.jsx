/**
 * Progress Bar Component
 * Displays loading progress with status message
 */

import React from "react";

const ProgressBar = ({ progress, status }) => (
  <div className="progress-container">
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${progress}%` }} />
    </div>
    <p className="progress-status">{status}</p>
    <p className="progress-percent">{progress}%</p>
  </div>
);

export default ProgressBar;
