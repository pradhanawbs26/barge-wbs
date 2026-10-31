import React from 'react';
import { HaulingConfig } from '../config/haulingConfig';
import { HaulingRecord } from '../types';
import { HaulingKpiSection } from './HaulingKpiSection';

interface TrainUnloadingViewProps {
  rows: HaulingRecord[];
  refDateIso: string;
  excludeOutlierDuration: boolean;
  onToggleExcludeOutlier: (val: boolean) => void;
  config?: HaulingConfig;
}

export const TrainUnloadingView: React.FC<TrainUnloadingViewProps> = ({
  rows,
  refDateIso,
  excludeOutlierDuration,
  onToggleExcludeOutlier,
  config,
}) => {
  return (
    <div className="space-y-6">
      <HaulingKpiSection
        rows={rows}
        refDateIso={refDateIso}
        excludeOutlierDuration={excludeOutlierDuration}
        onToggleExcludeOutlier={onToggleExcludeOutlier}
        config={config}
        defaultExpandTable={true}
        showKpiCardsAndTable={true}
      />
    </div>
  );
};
