import * as THREE from "three";
import { LaunchTrajectoryState } from "./LaunchController";
import { LAUNCH_PHASE_LABELS } from "../data/launchProfileData";

export class CockpitDisplays {
  private static instance: CockpitDisplays;

  public canvasCenter: HTMLCanvasElement;
  public canvasLeft: HTMLCanvasElement;
  public canvasRight: HTMLCanvasElement;

  public textureCenter: THREE.CanvasTexture;
  public textureLeft: THREE.CanvasTexture;
  public textureRight: THREE.CanvasTexture;

  private ctxCenter: CanvasRenderingContext2D;
  private ctxLeft: CanvasRenderingContext2D;
  private ctxRight: CanvasRenderingContext2D;

  private lastDrawTime = 0;

  private constructor() {
    // 1. Center PFD Canvas (512x512)
    this.canvasCenter = document.createElement("canvas");
    this.canvasCenter.width = 512;
    this.canvasCenter.height = 512;
    this.ctxCenter = this.canvasCenter.getContext("2d")!;
    this.textureCenter = new THREE.CanvasTexture(this.canvasCenter);
    this.textureCenter.minFilter = THREE.LinearFilter;
    this.textureCenter.magFilter = THREE.LinearFilter;

    // 2. Left Propulsion Canvas (512x512)
    this.canvasLeft = document.createElement("canvas");
    this.canvasLeft.width = 512;
    this.canvasLeft.height = 512;
    this.ctxLeft = this.canvasLeft.getContext("2d")!;
    this.textureLeft = new THREE.CanvasTexture(this.canvasLeft);
    this.textureLeft.minFilter = THREE.LinearFilter;
    this.textureLeft.magFilter = THREE.LinearFilter;

    // 3. Right Orbital Canvas (512x512)
    this.canvasRight = document.createElement("canvas");
    this.canvasRight.width = 512;
    this.canvasRight.height = 512;
    this.ctxRight = this.canvasRight.getContext("2d")!;
    this.textureRight = new THREE.CanvasTexture(this.canvasRight);
    this.textureRight.minFilter = THREE.LinearFilter;
    this.textureRight.magFilter = THREE.LinearFilter;
  }

  private lastLangIsVi: boolean | null = null;

  public static getInstance(): CockpitDisplays {
    if (!CockpitDisplays.instance) {
      CockpitDisplays.instance = new CockpitDisplays();
    }
    return CockpitDisplays.instance;
  }

  public update(trajectory: LaunchTrajectoryState, force = false, isVi = true): void {
    const now = performance.now();
    const langChanged = this.lastLangIsVi !== isVi;
    // Throttle canvas draw calls to 30fps to maximize GPU budget for WebGL
    if (!force && !langChanged && this.lastDrawTime > 0 && now - this.lastDrawTime < 33) return;
    this.lastDrawTime = now;
    this.lastLangIsVi = isVi;

    this.drawCenterPFD(trajectory, isVi);
    this.drawLeftSystems(trajectory, isVi);
    this.drawRightNavigation(trajectory, isVi);

    this.textureCenter.needsUpdate = true;
    this.textureLeft.needsUpdate = true;
    this.textureRight.needsUpdate = true;
  }

  // ----------------------------------------------------
  // 1. CENTER PRIMARY FLIGHT DISPLAY (PFD)
  // ----------------------------------------------------
  private drawCenterPFD(t: LaunchTrajectoryState, isVi: boolean): void {
    const ctx = this.ctxCenter;
    const w = 512;
    const h = 512;

    // Background
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);

    // Artificial Horizon Pitch Ladder
    ctx.save();
    ctx.beginPath();
    ctx.rect(100, 60, 312, 340);
    ctx.clip();

    // Positive pitchDeg (nose up) shifts the horizon line DOWN (+Y) so the fixed reticle at y=230 sits cleanly in blue sky!
    const clampedPitch = Math.max(-40, Math.min(82, t.pitchDeg));
    const pitchOffset = (clampedPitch / 45) * 112;
    const horizonY = 230 + pitchOffset;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, horizonY - 180, 0, horizonY);
    skyGrad.addColorStop(0, "#0369a1");
    skyGrad.addColorStop(1, "#0284c7");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(100, 0, 312, horizonY);

    // Ground gradient
    const gndGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY + 180);
    gndGrad.addColorStop(0, "#78350f");
    gndGrad.addColorStop(1, "#1e293b");
    ctx.fillStyle = gndGrad;
    ctx.fillRect(100, horizonY, 312, 512 - horizonY);

    // Horizon line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(100, horizonY);
    ctx.lineTo(412, horizonY);
    ctx.stroke();

    // Pitch ladder ticks (+10, +20, +30, +60, +90)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px monospace";
    ctx.lineWidth = 2;

    for (let deg = -30; deg <= 90; deg += 15) {
      if (deg === 0) continue;
      const y = horizonY - (deg / 45) * 112;
      const barW = deg % 30 === 0 ? 55 : 32;

      ctx.beginPath();
      ctx.moveTo(256 - barW, y);
      ctx.lineTo(256 + barW, y);
      ctx.stroke();

      if (deg % 30 === 0) {
        ctx.fillText(`${deg}°`, 256 + barW + 6, y + 4);
      }
    }

    // Aircraft / Spaceship Flight Director Reticle (Green Wings)
    ctx.strokeStyle = "#10b981";
    ctx.fillStyle = "#10b981";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 230, 8, 0, Math.PI * 2);
    ctx.stroke();
    // Wings
    ctx.beginPath();
    ctx.moveTo(215, 230);
    ctx.lineTo(244, 230);
    ctx.moveTo(268, 230);
    ctx.lineTo(297, 230);
    ctx.moveTo(256, 218);
    ctx.lineTo(256, 222);
    ctx.stroke();

    ctx.restore();

    // Left Speed Tape (m/s & Mach)
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(12, 60, 80, 340);
    ctx.strokeStyle = "#0284c7";
    ctx.strokeRect(12, 60, 80, 340);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(isVi ? "TỐC ĐỘ (m/s)" : "SPD (m/s)", 18, 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`${Math.round(t.velocityKms * 1000)}`, 18, 105);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.fillText("MACH", 18, 150);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`M ${t.machNumber.toFixed(2)}`, 18, 175);

    // Right Altitude Tape (km)
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(420, 60, 80, 340);
    ctx.strokeStyle = "#0284c7";
    ctx.strokeRect(420, 60, 80, 340);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(isVi ? "ĐỘ CAO (km)" : "ALT (km)", 424, 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`${t.altitudeKm.toFixed(1)}`, 426, 105);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(isVi ? "GIA TỐC G" : "G-FORCE", 424, 150);
    const gCol = t.accelerationG > 3.0 ? "#f43f5e" : t.accelerationG > 2.0 ? "#fbbf24" : "#10b981";
    ctx.fillStyle = gCol;
    ctx.font = "bold 18px monospace";
    ctx.fillText(`${t.accelerationG.toFixed(1)} G`, 426, 175);

    // Header Flight Status Bar
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(12, 12, 488, 38);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(12, 12, 488, 38);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px monospace";
    const phaseLabel = isVi
      ? LAUNCH_PHASE_LABELS[t.currentStep.phase]?.vi || t.currentStep.phase
      : LAUNCH_PHASE_LABELS[t.currentStep.phase]?.en || t.currentStep.phase;
    ctx.fillText(
      isVi
        ? `BAY TỰ ĐỘNG  |  PHA: ${phaseLabel}`
        : `AUTONOMOUS FLIGHT  |  PHASE: ${phaseLabel}`,
      24,
      36
    );

    // Bottom Pitch & Time Bar
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(12, 412, 488, 88);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.strokeRect(12, 412, 488, 88);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px monospace";
    const mins = Math.floor(t.timeSeconds / 60);
    const secs = Math.floor(t.timeSeconds % 60);
    const met = `T+${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    ctx.fillText(
      isVi ? `THỜI GIAN SỨ MỆNH: ${met}` : `MISSION ELAPSED TIME: ${met}`,
      24,
      436
    );
    ctx.fillText(
      isVi
        ? `GÓC CHÚC MŨI: ${t.pitchDeg.toFixed(1)}°  |  NGHIÊNG: 0.0°`
        : `ATTITUDE PITCH: ${t.pitchDeg.toFixed(1)}°  |  ROLL: 0.0°`,
      24,
      460
    );
    ctx.fillStyle = "#10b981";
    ctx.fillText(
      isVi
        ? "MÁY TÍNH BAY CHÍNH: ỔN ĐỊNH (DỰ PHÒNG BA KÊNH)"
        : "PRIMARY FLIGHT COMPUTER: NOMINAL (TRIPLE REDUNDANT)",
      24,
      484
    );
  }

  // ----------------------------------------------------
  // 2. LEFT PROPULSION & STAGING TELEMETRY DISPLAY
  // ----------------------------------------------------
  private drawLeftSystems(t: LaunchTrajectoryState, isVi: boolean): void {
    const ctx = this.ctxLeft;
    const w = 512;
    const h = 512;

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(12, 12, 488, 38);
    ctx.strokeStyle = "#06b6d4";
    ctx.strokeRect(12, 12, 488, 38);
    ctx.fillStyle = "#06b6d4";
    ctx.font = "bold 14px monospace";
    ctx.fillText(
      isVi ? "ĐỘNG CƠ ĐẨY & TRẠNG THÁI TÀU" : "PROPULSION & VEHICLE HEALTH",
      24,
      36
    );

    // 9-Engine Octagonal Cluster Matrix
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(20, 65, 220, 220);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
    ctx.strokeRect(20, 65, 220, 220);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(isVi ? "ĐỘNG CƠ TẦNG 1 (x9)" : "STAGE 1 ENGINES (x9)", 35, 90);

    const isStage1Firing = t.timeSeconds >= 10 && t.timeSeconds < 100;
    const isStage1Cutoff = t.timeSeconds >= 100;

    const enginePositions = [
      [90, 135], [130, 135], [170, 135],
      [90, 175], [130, 175], [170, 175],
      [90, 215], [130, 215], [170, 215]
    ];

    enginePositions.forEach(([ex, ey], i) => {
      ctx.beginPath();
      ctx.arc(ex, ey, 14, 0, Math.PI * 2);
      if (isStage1Firing) {
        ctx.fillStyle = "#f97316"; // Firing orange
      } else if (isStage1Cutoff) {
        ctx.fillStyle = "#334155"; // Cutoff
      } else {
        ctx.fillStyle = "#10b981"; // Armed green
      }
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`E${i + 1}`, ex - 6, ey + 4);
    });

    ctx.fillStyle = isStage1Firing ? "#f97316" : isStage1Cutoff ? "#94a3b8" : "#10b981";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      isStage1Firing
        ? isVi ? "LỰC ĐẨY: 100% [7.600 kN]" : "THRUST: 100% [7,600 kN]"
        : isStage1Cutoff
        ? isVi ? "NGẮT MECO / ĐÃ TÁCH TẦNG" : "STAGE 1 MECO / SEPARATED"
        : isVi ? "SẴN SÀNG KÍCH HOẠT" : "ENGINES ARMED",
      35,
      265
    );

    // Stage 2 Vacuum Engine Status
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(260, 65, 232, 220);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
    ctx.strokeRect(260, 65, 232, 220);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(isVi ? "ĐỘNG CƠ CHÂN KHÔNG TẦNG 2" : "STAGE 2 VACUUM (x1)", 275, 90);

    const isStage2Firing = t.timeSeconds >= 105 && t.timeSeconds < 280;
    ctx.beginPath();
    ctx.arc(376, 165, 32, 0, Math.PI * 2);
    ctx.fillStyle = isStage2Firing ? "#6366f1" : t.stage1Separated ? "#10b981" : "#334155";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.fillText("MVac", 362, 170);

    ctx.fillStyle = isStage2Firing ? "#818cf8" : "#94a3b8";
    ctx.fillText(
      isStage2Firing
        ? isVi ? "MVac ĐỐT LỬA: 981 kN" : "MVac IGNITED: 981 kN"
        : isVi ? "TẦNG 2 CHỜ LỆNH" : "STAGE 2 STANDBY",
      275,
      245
    );
    ctx.fillText(isVi ? "ÁP SUẤT BUỒNG: 9.7 MPa" : "CHAMBER: 9.7 MPa", 275, 265);

    // Propellant Tank Levels (LOX & RP-1 Bars)
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(20, 305, 472, 185);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.strokeRect(20, 305, 472, 185);

    // LOX level
    const loxPercent = Math.max(8, Math.round(100 - (t.timeSeconds / 280) * 92));
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      isVi ? `OXY LỎNG (LOX): ${loxPercent}%` : `LIQUID OXYGEN (LOX): ${loxPercent}%`,
      40,
      335
    );

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(40, 345, 432, 18);
    const loxGrad = ctx.createLinearGradient(40, 0, 472, 0);
    loxGrad.addColorStop(0, "#0284c7");
    loxGrad.addColorStop(1, "#38bdf8");
    ctx.fillStyle = loxGrad;
    ctx.fillRect(40, 345, (432 * loxPercent) / 100, 18);

    // RP-1 Kerosene level
    const rp1Percent = Math.max(10, Math.round(100 - (t.timeSeconds / 280) * 90));
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      isVi ? `NHIÊN LIỆU RP-1: ${rp1Percent}%` : `RP-1 ROCKET PROPELLANT: ${rp1Percent}%`,
      40,
      395
    );

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(40, 405, 432, 18);
    const rp1Grad = ctx.createLinearGradient(40, 0, 472, 0);
    rp1Grad.addColorStop(0, "#b45309");
    rp1Grad.addColorStop(1, "#fbbf24");
    ctx.fillStyle = rp1Grad;
    ctx.fillRect(40, 405, (432 * rp1Percent) / 100, 18);

    // Cabin Life Support Metrics
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      isVi
        ? "KHOANG LÁI: 101.3 kPa | O2: 20.9% | NHIỆT: 21.5°C"
        : "CABIN ENV: 101.3 kPa | O2: 20.9% | TEMP: 21.5°C",
      40,
      460
    );
  }

  // ----------------------------------------------------
  // 3. RIGHT ORBITAL TRAJECTORY & NAVIGATION DISPLAY
  // ----------------------------------------------------
  private drawRightNavigation(t: LaunchTrajectoryState, isVi: boolean): void {
    const ctx = this.ctxRight;
    const w = 512;
    const h = 512;

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(12, 12, 488, 38);
    ctx.strokeStyle = "#a855f7";
    ctx.strokeRect(12, 12, 488, 38);
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 14px monospace";
    ctx.fillText(
      isVi ? "QUỸ ĐẠO CHÈN LEO & DẪN ĐƯỜNG" : "ORBITAL INSERTION & TRAJECTORY",
      24,
      36
    );

    // Earth Curve & Trajectory Arc Vector Graph
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(20, 65, 472, 235);
    ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
    ctx.strokeRect(20, 65, 472, 235);

    // Draw Earth surface curve
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 460, 240, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Target circular orbit path (dashed green)
    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(256, 460, 350, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.setLineDash([]);

    // Actual Rocket Trajectory Ascent Curve
    const trajProgress = Math.min(t.timeSeconds / 280, 1.0);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, 230);
    ctx.quadraticCurveTo(
      160,
      130,
      90 + trajProgress * 320,
      230 - Math.pow(trajProgress, 0.7) * 115
    );
    ctx.stroke();

    // Current Spacecraft Blip (Pulsing Dot)
    const shipX = 90 + trajProgress * 320;
    const shipY = 230 - Math.pow(trajProgress, 0.7) * 115;
    ctx.beginPath();
    ctx.arc(shipX, shipY, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(isVi ? "TÀU DRAGON" : "DRAGON / SPACECRAFT", shipX + 12, shipY + 4);

    // Orbital Parameters Table
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(20, 315, 472, 175);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.strokeRect(20, 315, 472, 175);

    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 13px monospace";
    ctx.fillText(
      isVi
        ? "QUỸ ĐẠO ĐÍCH: 210 x 210 km LEO (ĐỒNG PHẲNG ISS)"
        : "TARGET ORBIT: 210 x 210 km LEO (ISS CO-PLANAR)",
      35,
      342
    );

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px monospace";
    const apogee = Math.max(185, Math.round(t.altitudeKm * 1.6 + 45));
    const perigee = t.stage1Separated ? Math.round(t.altitudeKm * 0.9) : 0;
    ctx.fillText(
      isVi
        ? `VIỄN ĐIỂM (Ha): ${apogee} km | CẬN ĐIỂM (Hp): ${perigee} km`
        : `APOGEE (Ha):  ${apogee} km  |  PERIGEE (Hp): ${perigee} km`,
      35,
      375
    );
    ctx.fillText(
      isVi
        ? "ĐỘ NGHIÊNG QUỸ ĐẠO: 51.6° (ĐỒNG PHẲNG ISS)"
        : "INCLINATION:  51.6° (ISS CO-PLANAR · CAPE CANAVERAL)",
      35,
      402
    );
    ctx.fillText(
      isVi
        ? `TẦM XA NGANG: ${(Math.max(0, (t.timeSeconds - 15) * t.velocityKms * 0.8)).toFixed(1)} km`
        : `DOWNRANGE:    ${(Math.max(0, (t.timeSeconds - 15) * t.velocityKms * 0.8)).toFixed(1)} km`,
      35,
      430
    );

    const qStatus =
      t.timeSeconds >= 45 && t.timeSeconds <= 75
        ? isVi ? "MAX-Q (ĐỈNH ÁP SUẤT ĐỘNG)" : "MAX-Q (PEAK DYNAMIC PRESSURE)"
        : isVi ? "TẢI KHÍ ĐỘNG BÌNH THƯỜNG" : "NOMINAL AERODYNAMIC LOADS";
    ctx.fillStyle = t.timeSeconds >= 45 && t.timeSeconds <= 75 ? "#f43f5e" : "#10b981";
    ctx.font = "bold 12px monospace";
    ctx.fillText(
      isVi ? `ÁP SUẤT ĐỘNG (Q): ${qStatus}` : `DYNAMIC PRESSURE (Q): ${qStatus}`,
      35,
      460
    );
  }
}
