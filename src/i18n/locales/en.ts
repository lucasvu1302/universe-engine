import { TranslationSchema } from '../types';

export const en: TranslationSchema = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    close: 'Close',
    exit: 'Exit',
    reset: 'Reset',
    search: 'Search',
    loading: 'Loading...',
    status: 'Status',
    orbit: 'ORBIT'
  },
  nav: {
    explore: 'Explore',
    planets: 'Planets',
    blackHole: 'Black Hole',
    galaxy: 'Galaxy',
    flight: 'Flight',
    tour: 'Tour',
    cinema: 'Cinema',
    land: 'Land',
    wormhole: 'Wormhole',
    sandbox: 'Sandbox',
    tars: 'TARS AI',
    scale: 'Scale',
    photoMode: 'Photo Mode',
    searchTooltip: 'Quick Search (Cmd+K)',
    hideOrbits: 'Hide Orbit Paths',
    showOrbits: 'Show Orbit Paths',
    muteAudio: 'Mute Spatial Audio',
    enableAudio: 'Enable Spatial Audio',
    settings: 'Engine Settings',
    singularities: 'Singularities',
    solarSystem: 'Solar System'
  },
  celestial: {
    sun: {
      name: 'Sun',
      displayName: 'The Sun (Sol)',
      type: 'Star',
      description: 'The yellow dwarf star at the center of the Solar System, containing 99.86% of the system mass and sustaining life on Earth.'
    },
    mercury: {
      name: 'Mercury',
      displayName: 'Mercury',
      type: 'Rocky',
      description: 'The smallest and closest planet to the Sun, heavily cratered and enduring extreme temperature fluctuations across its day and night sides.'
    },
    venus: {
      name: 'Venus',
      displayName: 'Venus',
      type: 'Atmospheric',
      description: 'The hottest planet in the Solar System due to a runaway greenhouse effect, blanketed in crushing carbon dioxide atmosphere and sulfuric acid clouds.'
    },
    earth: {
      name: 'Earth',
      displayName: 'Earth (Terra)',
      type: 'Habitable',
      description: 'The cradle of humanity and the only known haven in the cosmos hosting liquid water oceans, free oxygen, and vibrant life.'
    },
    moon: {
      name: 'Moon',
      displayName: 'The Moon (Luna)',
      type: 'Natural Satellite',
      description: 'Earth’s only natural satellite, site of humanity’s historic first footsteps on another celestial world during Apollo 11.'
    },
    mars: {
      name: 'Mars',
      displayName: 'Mars',
      type: 'Rocky',
      description: 'The Red Planet, home to Olympus Mons (the tallest volcano in the solar system), colossal canyon systems, and ancient dried river valleys.'
    },
    phobos: {
      name: 'Phobos',
      displayName: 'Phobos',
      type: 'Moon',
      description: 'The larger, grooved moon of Mars spiraling inward, destined to break apart into a ring system in 50 million years.'
    },
    deimos: {
      name: 'Deimos',
      displayName: 'Deimos',
      type: 'Moon',
      description: 'The outer, smaller moon of Mars, with a smooth surface smothered under a thick blanket of impact regolith.'
    },
    jupiter: {
      name: 'Jupiter',
      displayName: 'Jupiter',
      type: 'Gas Giant',
      description: 'King of the planets holding more mass than all other planets combined, featuring the centuries-old Great Red Spot storm vortex.'
    },
    io: {
      name: 'Io',
      displayName: 'Io',
      type: 'Volcanic Moon',
      description: 'The most volcanically active body in the Solar System, kneaded and heated relentlessly by Jupiter’s tidal gravity forces.'
    },
    europa: {
      name: 'Europa',
      displayName: 'Europa',
      type: 'Ice Ocean',
      description: 'A smooth ice-crusted moon harboring a global subsurface liquid ocean holding twice the water of all Earth’s oceans combined.'
    },
    ganymede: {
      name: 'Ganymede',
      displayName: 'Ganymede',
      type: 'Largest Moon',
      description: 'The largest moon in the Solar System (larger than Mercury), and the only moon known to generate its own intrinsic magnetic field.'
    },
    callisto: {
      name: 'Callisto',
      displayName: 'Callisto',
      type: 'Ancient Surface',
      description: 'The most heavily cratered world in the solar system, preserving an ancient, un-eroded surface frozen in time for 4 billion years.'
    },
    saturn: {
      name: 'Saturn',
      displayName: 'Saturn',
      type: 'Ringed Giant',
      description: 'The crown jewel of the solar system, adorned with brilliant planetary rings composed of billions of pristine water ice fragments.'
    },
    titan: {
      name: 'Titan',
      displayName: 'Titan',
      type: 'Dense Atmosphere',
      description: 'The only moon with a dense atmosphere and stable surface liquid bodies, filled with rivers and lakes of liquid methane and ethane.'
    },
    enceladus: {
      name: 'Enceladus',
      displayName: 'Enceladus',
      type: 'Cryovolcanic',
      description: 'A dazzling reflective ice world venting supersonic geysers of salty water vapor and organic molecules directly into Saturn’s E ring.'
    },
    uranus: {
      name: 'Uranus',
      displayName: 'Uranus',
      type: 'Ice Giant',
      description: 'An icy cyan world with an extreme 97.77° axial tilt, practically rolling on its side through space in its 84-year orbit around the Sun.'
    },
    neptune: {
      name: 'Neptune',
      displayName: 'Neptune',
      type: 'Supersonic Winds',
      description: 'The outermost major planet, an intense cobalt blue giant whipped by the fastest supersonic windstorms in the solar system exceeding 2,100 km/h.'
    },
    triton: {
      name: 'Triton',
      displayName: 'Triton',
      type: 'Retrograde Moon',
      description: 'Neptune’s largest moon, a captured Kuiper Belt dwarf planet orbiting backward with active cryogeysers of liquid nitrogen.'
    },
    blackhole: {
      name: 'Gargantua',
      displayName: 'Gargantua (Supermassive Black Hole)',
      type: 'Singularity',
      description: 'A supermassive rotating Kerr black hole. Warps space-time via extreme general relativity, creating an Einstein ring and photon sphere.'
    },
    pulsar: {
      name: 'PSR B1257+12',
      displayName: 'PSR B1257+12 (Relativistic Pulsar)',
      type: 'Neutron Star',
      description: 'A millisecond pulsar with colossal magnetic field lines that accelerate charged particles into continuous relativistic lighthouse beams sweeping through deep space.'
    }
  },
  targetHud: {
    diameter: 'Diameter',
    gravity: 'Gravity',
    meanTemp: 'Mean Temp',
    knownMoons: 'Known Moons',
    orbitPeriod: 'Orbit Period',
    pulsarPlanets: 'Pulsar Planets',
    focusTarget: 'Focus Camera on Target',
    supermassiveSingularity: 'Supermassive Singularity (Deep Space)',
    neutronStar: 'High-Energy Relativistic Neutron Star',
    naturalSatelliteOf: 'Natural Satellite of',
    solarCenter: 'Solar System Center',
    singularityInfinity: '∞ (Singularity)',
    coreZeroK: '0 K (Core)'
  },
  flight: {
    title: '6-DOF SPACECRAFT FLIGHT CONTROLS',
    sub: 'Free Flight Exploration Mode',
    velocity: 'Velocity',
    boost: 'BOOST (SHIFT)',
    precision: 'PRECISION (CTRL)',
    brake: 'BRAKE (SPACE)',
    controlsHeading: 'FLIGHT MANUAL',
    wasdMove: 'W/S: Throttle | A/D: Strafe',
    rfVertical: 'R/F: Vertical Elevation',
    shiftBoost: 'Shift: Boost 300%',
    ctrlPrecision: 'Ctrl: Fine Maneuvering Mode',
    spaceBrake: 'Space: Instant Aerodynamic Brake',
    mouseLook: 'Drag Mouse: Free Look 360°'
  },
  surface: {
    marsJezeroTitle: 'MARS SURFACE: JEZERO CRATER',
    marsJezeroSub: 'Perseverance Rover & Ingenuity Landing Site',
    moonApolloTitle: 'THE MOON: APOLLO 11 TRANQUILITY BASE',
    moonApolloSub: 'Sea of Tranquility - July 20, 1969',
    altitude: 'Altitude',
    descentVelocity: 'Descent Rate',
    surfaceTemp: 'Surface Temp',
    atmosphericPressure: 'Atm Pressure',
    ascendOrbit: 'ASCEND TO ORBIT',
    marsStatus: 'Observing Volumetric Dust Storm & Blue Martian Sunset',
    moonStatus: 'Observing Earthrise Horizon & Apollo 11 Lunar Module',
    jezeroNotes: 'Ancient river delta lake bed that held deep water 3.5 billion years ago.',
    apolloNotes: 'Neil Armstrong and Buzz Aldrin’s bootprints preserved forever in lunar vacuum.'
  },
  millers: {
    title: 'MILLER’S OCEAN WORLD',
    sub: 'Exosystem Across 4D Gravitational Wormhole',
    timeDilation: '1 HOUR HERE = 7 YEARS ON EARTH',
    megawaveWarning: 'WARNING: 1,200M GRAVITATIONAL MEGAWAVE INCOMING',
    exitHyperspace: 'WARP BACK TO SOLAR SYSTEM'
  },
  sandbox: {
    title: 'GRAVITATIONAL SANDBOX & CATACLYSMS',
    desc: 'Trigger extreme astrophysical cataclysms across the solar system',
    meteorTitle: 'Meteor Impact',
    meteorDesc: 'Launch a blazing asteroid into Earth, causing a shockwave and molten magma crater',
    tidalTitle: 'Tidal Disruption Event',
    tidalDesc: 'Spaghettify a celestial object into Gargantua, unleashing an ultra-bright relativistic jet',
    supernovaTitle: 'Supernova Explosion',
    supernovaDesc: 'Collapse a massive star into a blinding flash and expanding multi-colored remnant nebula',
    activeNotice: 'Cataclysm simulation in progress...'
  },
  tars: {
    title: 'AI COPILOT TARS 9000',
    subtitle: '100% Native Browser Offline Voice Assistant',
    listening: 'Listening for your commands...',
    idle: 'Click mic and speak your command...',
    clickToSpeak: 'Click to Speak',
    honestyParam: 'Honesty Level',
    humorParam: 'Humor Level',
    voiceTipsHeading: 'SUGGESTED VOICE COMMANDS',
    tipMars: '"Go to Mars" or "Tới Sao Hỏa"',
    tipCinema: '"Cinema Mode" or "Bật rạp phim"',
    tipBlackHole: '"Gargantua" or "Hố đen"',
    tipMusic: '"Play Music" or "Bật nhạc"'
  },
  cinema: {
    title: 'IMAX 2.39:1 CINEMATIC DIRECTOR',
    anamorphicBadge: 'PANAVISION 2.39:1 ANAMORPHIC',
    shotDrift: 'Orbital Sunrise Drift',
    shotRingSki: 'Saturn Ice Ring Skiing',
    shotSlingshot: 'Jupiter Gravitational Slingshot',
    shotAuto: 'Autonomous Director Cut',
    pressEsc: 'Press ESC or C to exit Cinema Mode'
  },
  time: {
    simDays: 'SIMULATION DAYS',
    paused: 'PAUSED',
    speed1x: '1× Realtime',
    speed10x: '10× (Fast Forward)',
    speed100x: '100× (Orbital Dynamics)',
    speed1000x: '1000× (Galactic Epoch)',
    resetTooltip: 'Reset simulation time to zero'
  },
  settings: {
    title: 'SYSTEM SETTINGS',
    language: 'Display Language / Ngôn Ngữ',
    langVi: 'Tiếng Việt (Default)',
    langEn: 'English',
    graphicsPreset: 'Graphics Preset',
    gpuTier: 'GPU Tier',
    orbitsToggle: 'Keplerian Orbit Trajectories',
    orbitsDesc: 'Render elliptical orbits based on exact Keplerian celestial mechanics',
    audioToggle: 'Spatial Audio Atmosphere',
    audioDesc: 'Full multi-dimensional space soundscape and Kepler harmonices synth',
    reducedMotionToggle: 'Reduced Camera Vibration',
    reducedMotionDesc: 'Dampen high-speed aerodynamic screen shake and violent turbulence'
  },
  photo: {
    title: 'ASTRONOMICAL PHOTO MODE',
    resolution: 'Resolution',
    hideHud: 'Hide All HUD Interfaces',
    takePhoto: 'Capture Frame',
    capturing: 'Rendering high-resolution frame...',
    saved: 'Screenshot captured and downloaded!'
  },
  scale: {
    title: 'SCALE OF THE UNIVERSE (10ⁿ)',
    subtitle: 'From human scale to the edges of the observable cosmos',
    stepHuman: 'Human (1.7 meters - 10⁰ m)',
    stepEarth: 'Earth (12,742 km - 10⁷ m)',
    stepSolarSystem: 'Solar System (287 billion km - 10¹² m)',
    stepMilkyWay: 'Milky Way Galaxy (100,000 light years - 10²¹ m)',
    stepObservableUniverse: 'Observable Universe (93 billion light years - 10²⁶ m)'
  },
  commandPalette: {
    placeholder: 'Search celestial bodies, moons, black hole, commands... (Esc to close)',
    noResults: 'No matching celestial bodies or commands found.',
    catNavigation: 'Navigation',
    catSingularity: 'Singularity',
    catExperience: 'Experience',
    catCinema: 'Cinema',
    catAudio: 'Audio',
    catView: 'View',
    catGraphics: 'Graphics',
    catCataclysms: 'Cataclysms',
    cmdSun: 'Fly to Center of the Sun (Sol)',
    cmdOverview: 'Solar System Panoramic Overview',
    cmdGalaxy: 'Milky Way Galactic Overview',
    cmdBlackHole: 'Warp to Gargantua Supermassive Black Hole',
    cmdPulsar: 'Warp to Relativistic Pulsar (PSR B1257+12)',
    cmdFlight: 'Enable Free Flight (6-DOF Spacecraft Controls)',
    cmdTour: 'Start Cinematic Auto Tour',
    cmdLandMars: 'Surface Landing: Mars Jezero Crater',
    cmdLandMoon: 'Surface Landing: Apollo 11 Tranquility Base',
    cmdWormhole: 'Traverse 4D Wormhole to Miller’s Ocean World',
    cmdCinemaDrift: 'Cinema: Earth Orbital Sunrise Drift',
    cmdCinemaRingSki: 'Cinema: Saturn Ice Ring Skiing Flyby',
    cmdCinemaSlingshot: 'Cinema: Jupiter Gravitational Slingshot',
    cmdKeplerSynth: 'Toggle Kepler Harmonices Mundi Ambient Synth',
    cmdOrbits: 'Toggle Keplerian Orbit Paths',
    cmdSound: 'Toggle Spatial Audio Soundscape',
    cmdUltraGraphics: 'Graphics: ULTRA Quality Preset'
  }
};
