import React from 'react';
import { MastercardDealsView } from './MastercardDealsView';

export const MastercardActiveTodayView: React.FC = () => {
  return <MastercardDealsView initialValidity="active_today" />;
};
