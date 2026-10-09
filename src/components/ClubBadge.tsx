import React from 'react';
import { ClubId, CLUBS } from '../types/club';

interface ClubBadgeProps {
  clubId: ClubId;
  size?: 'sm' | 'md';
  className?: string;
}

export const ClubBadge: React.FC<ClubBadgeProps> = ({ clubId, size = 'sm', className = '' }) => {
  const config = CLUBS[clubId] || CLUBS.behatsdaa;

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.badgeBg} ${config.badgeText} ${config.borderClass} ${sizeClasses} ${className}`}
      title={config.name}
    >
      {config.shortName}
    </span>
  );
};
