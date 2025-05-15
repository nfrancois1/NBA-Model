import React from 'react';
import { TeamInjuries } from '@/types/game';
import { Ban, AlertCircle, AlertTriangle } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InjuryBadgeProps {
  injuries?: TeamInjuries;
  team: string;
}

export default function InjuryBadge({ injuries, team }: InjuryBadgeProps) {
  if (!injuries || injuries.injuries.length === 0) {
    return null;
  }

  // Determine severity based on impact score
  const getSeverityLevel = (impactScore: number) => {
    if (impactScore >= 0.6) return { color: 'bg-red-500', icon: <Ban className="h-4 w-4" />, text: 'High' };
    if (impactScore >= 0.3) return { color: 'bg-amber-500', icon: <AlertTriangle className="h-4 w-4" />, text: 'Medium' };
    return { color: 'bg-blue-500', icon: <AlertCircle className="h-4 w-4" />, text: 'Low' };
  };

  const severity = getSeverityLevel(injuries.impactScore);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center space-x-1 text-white text-xs rounded-full px-2 py-0.5 ${severity.color}`}>
            {severity.icon}
            <span>Injuries</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{team} Injuries</p>
            <p className="text-sm">Impact: {severity.text} ({(injuries.impactScore * 100).toFixed(0)}%)</p>
            <ul className="text-xs space-y-1 mt-1">
              {injuries.injuries.map((injury, idx) => (
                <li key={idx} className="flex flex-col">
                  <span className="font-semibold">{injury.player} ({injury.position})</span>
                  <span>{injury.status}: {injury.type}</span>
                  {injury.details && <span className="text-gray-500 italic">{injury.details}</span>}
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 