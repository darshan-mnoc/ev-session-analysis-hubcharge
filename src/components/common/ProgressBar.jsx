/**
 * Progress Bar Component
 * Displays loading progress with status message
 */

import React from "react";

const ProgressBar = ({ progress, status }) => (
  <div className="flex w-72 max-w-full flex-col gap-2">
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{status}</span>
      <span className="font-medium text-foreground">{progress}%</span>
    </div>
  </div>
);

export default ProgressBar;
