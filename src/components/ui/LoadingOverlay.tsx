// src/components/ui/LoadingOverlay.tsx
import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  progress: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, progress }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
      <div className="text-white text-2xl mb-4">Loading...</div>
      <div className="w-1/2 bg-gray-200 rounded-full h-4">
        <div
          className="bg-blue-600 h-4 rounded-full"
          style={{ width: `${progress * 100}%` }}
        ></div>
      </div>
      <div className="text-white text-lg mt-2">{`${Math.round(progress * 100)}%`}</div>
    </div>
  );
};
