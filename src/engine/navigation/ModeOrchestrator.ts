import { ActiveCosmicLab, ActiveSpaceGame, ActiveSurface, useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { SimulationEventBus } from '@/simulation/core/SimulationEventBus';
import { AudioManager } from '@/engine/audio/AudioManager';
import { getPlanetaryEventById } from '@/data/planetaryEventsData';

/**
 * Cross-system exclusive mode orchestrator.
 * Lives outside pure Zustand store `useAppStore` so there are zero circular imports
 * between Zustand, SimulationManager, CameraManager, and CinematicDirector.
 */
export class ModeOrchestrator {
  private static instance: ModeOrchestrator;
  private takeoffTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    SimulationEventBus.getInstance().on('simulation:scenario_change', (sc) => {
      if (sc !== 'none') {
        this.cancelPendingTakeoff();
      }
    });
  }

  public static getInstance(): ModeOrchestrator {
    if (!ModeOrchestrator.instance) {
      ModeOrchestrator.instance = new ModeOrchestrator();
    }
    return ModeOrchestrator.instance;
  }

  public cancelPendingTakeoff(): void {
    if (this.takeoffTimer !== null) {
      clearTimeout(this.takeoffTimer);
      this.takeoffTimer = null;
    }
    if (useAppStore.getState().reEntryActive) {
      useAppStore.getState().setReEntryActive(false);
    }
  }

  private clearExclusiveSystems(): void {
    this.cancelPendingTakeoff();

    const sim = SimulationManager.getInstance();
    if (sim.getActiveScenario() !== 'none') {
      sim.exitScenario();
    }

    const store = useAppStore.getState();
    if (store.cinemaMode) {
      CinematicDirector.getInstance().exitCinemaMode();
    }

    useAppStore.setState({
      compareMode: false,
      scaleExplorer: false,
      activeTour: false,
      photoMode: false,
      inExoSystem: false,
      activeSurface: 'none',
      activeEventSurfaceId: null,
      activeCosmicLab: 'none',
      activeSpaceGame: 'none',
      gameHubOpen: false,
      isSandboxOpen: false,
      isTarsOpen: false,
      solarStormActive: false,
      missionPlannerOpen: false,
      missionLaunching: false,
      planetariumTelescopeTarget: 'none',
      trappistViewMode: 'system',
      dysonMode: 'dyson_swarm',
      defenseLaunched: false,
      relativityTab: 'dilation_lensing',
      relativityDivePlaying: false,
      kesslerTriggered: false,
      reEntryActive: false,
    });

    const cam = CameraManager.getInstance();
    cam.exitGalaxyMode(false);
    cam.setFov(50);
  }

  public enterCosmicLab(lab: ActiveCosmicLab): void {
    if (lab === 'none') {
      this.exitCosmicLab();
      return;
    }

    this.clearExclusiveSystems();
    useAppStore.setState({
      activeCosmicLab: lab,
      cameraMode: 'ORBIT',
    });
    useAppStore.getState().recordRecentExperience(lab);
    CameraManager.getInstance().setCosmicLabMode(lab);
  }

  public exitCosmicLab(): void {
    this.cancelPendingTakeoff();
    useAppStore.setState({
      activeCosmicLab: 'none',
      planetariumTelescopeTarget: 'none',
      trappistViewMode: 'system',
      dysonMode: 'dyson_swarm',
      defenseLaunched: false,
      relativityTab: 'dilation_lensing',
      relativityDivePlaying: false,
      kesslerTriggered: false,
      cameraMode: 'ORBIT',
    });
    const cam = CameraManager.getInstance();
    cam.setFov(50);
    cam.flyToSolarSystemOverview();
  }

  public enterSurface(surface: ActiveSurface): void {
    if (surface === 'none') {
      this.exitAllModes();
      return;
    }

    this.clearExclusiveSystems();
    useAppStore.setState({
      activeSurface: surface,
      cameraMode: 'ORBIT',
    });
    useAppStore
      .getState()
      .recordRecentExperience(surface === 'europa' || surface === 'titan' ? `land_${surface}` : 'land_surface');
    CameraManager.getInstance().setSurfaceMode(surface);
  }

  public startSurfaceTakeoff(): void {
    this.cancelPendingTakeoff();
    useAppStore.getState().setReEntryActive(true);

    this.takeoffTimer = setTimeout(() => {
      this.takeoffTimer = null;
      const store = useAppStore.getState();
      if (
        !store.reEntryActive ||
        store.activeSurface === 'none' ||
        SimulationManager.getInstance().getActiveScenario() !== 'none'
      ) {
        return;
      }
      useAppStore.setState({
        activeSurface: 'none',
        reEntryActive: false,
        cameraMode: 'ORBIT',
      });
      CameraManager.getInstance().flyToSolarSystemOverview();
    }, 1800);
  }

  public toggleSolarStorm(force?: boolean): void {
    const store = useAppStore.getState();
    const next = force !== undefined ? force : !store.solarStormActive;

    if (!next) {
      useAppStore.setState({ solarStormActive: false });
      return;
    }

    this.clearExclusiveSystems();
    useAppStore.setState({
      solarStormActive: true,
      missionPlannerOpen: false,
      cameraMode: 'ORBIT',
      targetId: 'earth',
    });
    AudioManager.getInstance().playSolarStormPulse();
    CameraManager.getInstance().focusPlanet('earth');
  }

  public toggleMissionPlanner(force?: boolean): void {
    const store = useAppStore.getState();
    const next = force !== undefined ? force : !store.missionPlannerOpen;

    if (!next) {
      useAppStore.setState({ missionPlannerOpen: false, missionLaunching: false });
      return;
    }

    this.clearExclusiveSystems();
    useAppStore.setState({
      missionPlannerOpen: true,
      solarStormActive: false,
      cameraMode: 'ORBIT',
      targetId: 'sun',
    });
    CameraManager.getInstance().flyToSolarSystemOverview();
  }

  public enterEventSurface(eventId: string): void {
    const ev = getPlanetaryEventById(eventId);
    if (!ev) return;

    this.clearExclusiveSystems();
    useAppStore.setState({
      activeEventSurfaceId: ev.id,
      selectedPlanetaryEventId: ev.id,
      planetaryEventsEnabled: true,
      targetId: ev.bodyId,
      cameraMode: 'ORBIT',
    });
    CameraManager.getInstance().setEventSurfaceMode(ev.id);
  }

  public exitEventSurface(): void {
    const activeId = useAppStore.getState().activeEventSurfaceId;
    if (!activeId) return;

    const ev = getPlanetaryEventById(activeId);
    this.cancelPendingTakeoff();
    useAppStore.setState({
      activeEventSurfaceId: null,
      cameraMode: 'ORBIT',
    });
    const cam = CameraManager.getInstance();
    cam.setFov(50);
    if (ev) {
      cam.focusPlanet(ev.bodyId);
    } else {
      cam.flyToSolarSystemOverview();
    }
  }

  public enterSpaceGame(game: Exclude<ActiveSpaceGame, 'none'>): void {
    this.clearExclusiveSystems();
    useAppStore.setState({
      activeSpaceGame: game,
      gameHubOpen: false,
      cameraMode: 'ORBIT',
    });
    useAppStore.getState().recordRecentExperience(`game_${game}`);
    CameraManager.getInstance().setSpaceGameMode(game);
  }

  public exitSpaceGame(): void {
    this.cancelPendingTakeoff();
    useAppStore.setState({
      activeSpaceGame: 'none',
      gameHubOpen: false,
      cameraMode: 'ORBIT',
    });
    const cam = CameraManager.getInstance();
    if (cam.camera) {
      cam.camera.up.set(0, 1, 0);
    }
    cam.clearOrbitInertia();
    cam.setFov(50);
    cam.flyToSolarSystemOverview();
  }

  public exitAllModes(): void {
    this.clearExclusiveSystems();
    useAppStore.setState({ cameraMode: 'ORBIT' });
  }
}
