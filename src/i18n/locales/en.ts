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
    constellations: 'Constellations',
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
    },
    iss: {
      name: 'ISS Station',
      displayName: 'International Space Station (ISS)',
      type: 'Orbital Station',
      description: 'Humanity’s permanent orbital laboratory in Low Earth Orbit at 420 km altitude, completing 15.5 orbits per day at 27,600 km/h.'
    },
    jwst: {
      name: 'James Webb (JWST)',
      displayName: 'James Webb Space Telescope (JWST)',
      type: 'L2 Observatory',
      description: 'Deep-infrared space observatory stationed in a halo orbit around the Sun-Earth L2 point 1.5 million km beyond Earth with an 18-segment gold beryllium mirror.'
    },
    voyager1: {
      name: 'Voyager 1',
      displayName: 'Voyager 1 Interstellar Probe',
      type: 'Interstellar Probe',
      description: 'The farthest human-made object in history (163 AU), cruising through interstellar space beyond the heliopause carrying the Golden Record.'
    },
    voyager2: {
      name: 'Voyager 2',
      displayName: 'Voyager 2 Grand Tour Probe',
      type: 'Interstellar Probe',
      description: 'The only spacecraft to have visited all four giant outer planets—Jupiter, Saturn, Uranus, and Neptune—now exploring interstellar space.'
    },
    constellation_orion: {
      name: 'Orion',
      displayName: 'Orion (The Hunter)',
      type: 'Constellation',
      description: 'Crown jewel of the winter night sky featuring the three-star Belt, blue supergiant Rigel, red supergiant Betelgeuse, and the naked-eye Orion Nebula (M42) nursery.'
    },
    constellation_ursa_major: {
      name: 'Ursa Major',
      displayName: 'Ursa Major (Great Bear & Big Dipper)',
      type: 'Constellation',
      description: 'Third-largest IAU constellation, famed for the seven-star Big Dipper pointer asterism toward Polaris and the interacting galaxy pair M81 and M82.'
    },
    constellation_cassiopeia: {
      name: 'Cassiopeia',
      displayName: 'Cassiopeia (The Seated Queen)',
      type: 'Constellation',
      description: 'Unmistakable five-star W asterism gleaming inside the northern Milky Way band, home to young X-ray supernova remnant Cassiopeia A.'
    },
    constellation_cygnus: {
      name: 'Cygnus',
      displayName: 'Cygnus (The Swan · Northern Cross)',
      type: 'Constellation',
      description: 'Soaring along the summer Milky Way rift with luminous supergiant Deneb and historic stellar-mass black hole binary Cygnus X-1.'
    },
    constellation_scorpius: {
      name: 'Scorpius',
      displayName: 'Scorpius (The Scorpion)',
      type: 'Constellation',
      description: 'Dramatic southern zodiacal constellation sweeping near the Galactic Center, anchored by crimson supergiant Antares and globular cluster M4.'
    },
    constellation_crux: {
      name: 'Crux',
      displayName: 'Crux (The Southern Cross)',
      type: 'Constellation',
      description: 'Smallest yet most concentrated first-magnitude constellation in the southern sky, guiding mariners to the South Celestial Pole beside the Jewel Box cluster.'
    },
    constellation_leo: {
      name: 'Leo',
      displayName: 'Leo (The Lion)',
      type: 'Constellation',
      description: 'Classic spring zodiacal Lion defined by its trapezoid body, the Sickle mane around blue-white Regulus, and the interacting Leo Triplet of galaxies (M65, M66).'
    },
    constellation_taurus: {
      name: 'Taurus',
      displayName: 'Taurus (The Bull & Pleiades)',
      type: 'Constellation',
      description: 'Ancient zodiacal Bull showcasing fiery orange giant Aldebaran, the sparkling Pleiades (M45) open cluster, and the Crab Nebula pulsar remnant (M1).'
    }
  },
  targetHud: {
    diameter: 'Diameter',
    gravity: 'Gravity',
    meanTemp: 'Mean Temp',
    knownMoons: 'Known Moons',
    orbitPeriod: 'Orbit Period',
    pulsarPlanets: 'Pulsar Planets',
    brightestStar: 'Brightest Star',
    skyArea: 'Sky Area',
    starDistance: 'Star Distance',
    deepSkyObjects: 'Deep-Sky Gems',
    constellationDossier: 'Mythology Review & Observing Guide',
    mythologyHeading: 'Mythology & Star-Hopping Lore',
    bestSeasonHeading: 'Best Viewing Season',
    neighborConstellationsHeading: 'Neighboring Constellations (Click To Pan)',
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
  },
  vip: {
    starMapLabel: 'Star Map',
    starMapTooltip: 'Toggle 3D Constellation Sky-Map & Goldilocks Habitable Zone',
    radarTitle: 'ORBITAL RADAR',
    radarExpand: 'Open Orbital Radar',
    radarCollapse: 'Minimize Radar',
    lightDelay: 'Light Delay',
    earthGravityRatio: 'Earth Gravity',
    deepDossier: 'Deep Astrophysics Dossier',
    hideDossier: 'Hide Dossier',
    mass: 'Total Mass',
    dayLength: 'Rotation Period',
    axialTilt: 'Axial Obliquity',
    moonsHeading: 'Natural Moons (Click To Fly)',
    saveView: 'Save Viewpoint',
    savedViews: 'Saved VIP Viewpoints',
    noSavedViews: 'No saved viewpoints yet',
    quickLandMars: 'Land on Mars 3D',
    quickLandMoon: 'Land on Moon 3D',
    quickLaunchRocket: 'Launch 3D Spacecraft',
    quickEarthHistory: 'Earth History 4.54 Ga',
    quickRingSki: 'Ring-Ski Flyby',
    quickWormhole: 'Enter 4D Wormhole',
    quickSlingshot: 'Gravity Slingshot'
  },
  cosmic: {
    sectionTitle: 'New 3D Cosmic Observatory & Labs',
    solarStormTitle: '3D Solar Storm, Magnetosphere & Aurora',
    solarStormSub: 'CME plasma, dipole shield & polar aurora curtains',
    eclipseTitle: 'Total Solar Eclipse & Blood Moon 3D',
    eclipseSub: 'Diamond Ring, Corona, Orbital Umbra & Blood Moon',
    binaryMergerTitle: 'Binary Black Hole Merger & LIGO Waves',
    binaryMergerSub: 'Spacetime quadrupole ripples & Web Audio chirp',
    landEuropaTitle: 'Land on Europa Ice Shell 3D',
    landEuropaSub: 'Fractured ice crust, cryogeysers & giant Jupiter',
    landTitanTitle: 'Land on Titan Shoreline 3D',
    landTitanSub: 'Dense amber haze, methane lake & Huygens probe',
    hohmannTitle: 'Hohmann Transfer Mission Planner',
    hohmannSub: 'Offline geocentric/heliocentric Δv & Gravity Assist',
    stellarLabTitle: '3D Volumetric Nebulae & Stellar Lab',
    stellarLabSub: 'Pillars of Creation M16, Crab M1 & live H-R diagram',
    planetariumTitle: '360° Night Sky Planetarium & Telescope',
    planetariumSub: 'Real Alt/Az sky dome, Meteor Showers & Optical Zoom',
    megaHubTitle: 'Cosmic Observatory Hub',
    megaHubSearch: 'Search labs, surfaces, physics & tools...',
    megaHubRecent: 'Recently opened',
    megaHubEmpty: 'No matching cosmic experiences found.',
    tabAll: 'All',
    tabPhysics: 'Physics & Black Holes',
    tabSurfaces: 'Surfaces & Cutaway',
    tabPlanets: 'Planets & Engineering',
    tabDeepSpace: 'Deep Space & Galaxies',
    tabTools: 'Tools & Cinema',
    nbodyTitle: 'Three-Body & N-Body Gravity Sandbox',
    nbodySub: 'Chaotic Trisolaris, Figure-8 orbit, Habitable Zone & Roche limit',
    marsTerraformTitle: 'Mars Terraforming 1,000-Year Sim',
    marsTerraformSub: 'Polar melt, northern ocean, blue atmosphere & green biosphere',
    cutawayTitle: '3D Planetary & Stellar Interior Cutaway',
    cutawaySub: 'Interactive cross-sections of Earth, Sun, Jupiter, Europa & Neutron Star',
    defenseTitle: 'Planetary Defense · DART & Apophis',
    defenseSub: 'Kinetic impactor, Gravity Tractor & Laser ablation deflection',
    trappistTitle: 'TRAPPIST-1 Exoplanets & Transit Curve',
    trappistSub: '7 resonant worlds, TRAPPIST-1e sky view & live Kepler light curve',
    dysonTitle: 'Dyson Swarm & O’Neill Cylinder',
    dysonSub: 'Kardashev Type II solar collectors & rotating 1g space habitat',
    relativityTitle: 'Relativity, Einstein Ring & Black Hole Dive',
    relativitySub: 'Lorentz/Kerr clocks, gravitational lensing & first-person plunge',
    kesslerTitle: 'Kessler Syndrome & LEO Satellite Map',
    kesslerSub: '2,000+ LEO/MEO/GEO satellites & cascading orbital debris field'
  }
};
