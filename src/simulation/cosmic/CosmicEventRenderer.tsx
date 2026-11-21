import React from "react";
import { CosmicEventManager, CosmicPlaybackState } from "./CosmicEventManager";
import { CosmicEventType } from "../core/types";
import { BigBangVisual } from "./BigBangVisual";
import { StarBirthVisual } from "./StarBirthVisual";
import { SupernovaVisual } from "./SupernovaVisual";
import { PlanetFormationVisual } from "./PlanetFormationVisual";
import { GalaxyCollisionVisual } from "./GalaxyCollisionVisual";

interface CosmicEventRendererProps {
  eventType?: CosmicEventType;
  playback?: CosmicPlaybackState;
}

export const CosmicEventRenderer: React.FC<CosmicEventRendererProps> = ({
  eventType,
  playback
}) => {
  const resolvedType =
    eventType ??
    playback?.currentEvent.type ??
    CosmicEventManager.getInstance().getPlaybackState().currentEvent.type;
  const fallbackProgress = playback?.progress;

  return (
    <group>
      {resolvedType === "BIG_BANG" && <BigBangVisual progress={fallbackProgress} />}
      {resolvedType === "STAR_BIRTH" && <StarBirthVisual progress={fallbackProgress} />}
      {resolvedType === "SUPERNOVA" && <SupernovaVisual progress={fallbackProgress} />}
      {resolvedType === "PLANET_FORMATION" && <PlanetFormationVisual progress={fallbackProgress} />}
      {resolvedType === "GALAXY_COLLISION" && <GalaxyCollisionVisual progress={fallbackProgress} />}
    </group>
  );
};
