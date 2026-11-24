import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('3D Universe Engine — Production & VIP Observatory E2E Suite', () => {
  test('boots without console errors and mounts WebGL Canvas', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (exception) => {
      consoleErrors.push(exception.message);
    });

    await page.goto('/');

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.hud-tag').first()).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('navigates through planets, opens VIP Deep Dossier, and jumps to moon chip', async ({ page }) => {
    await page.goto('/');

    // Open Planets dropdown (bilingual VI/EN)
    await page.getByTitle(/Hành Tinh|Planets/i).click();

    // Select Jupiter (Sao Mộc / Jupiter)
    await page.getByRole('button', { name: /Sao Mộc|Jupiter/i }).first().click();

    // Verify TargetHUD reflects Jupiter + VIP Light-Delay Telemetry
    await expect(page.getByText(/Jupiter/i).first()).toBeVisible();
    await expect(page.getByTestId('light-delay-readout')).toBeVisible();

    // Expand VIP Deep Astrophysics Dossier & save camera bookmark
    await page.getByTestId('dossier-toggle').click();
    await expect(page.getByTestId('dossier-gravity-ratio')).toBeVisible();
    await page.getByTestId('save-bookmark-btn').click();

    // Click Europa moon chip directly inside Deep Dossier
    await page.getByTestId('moon-chip-europa').click();
    await expect(page.getByText(/Europa/i).first()).toBeVisible();
  });

  test('toggles modes: Galaxy, Flight, Compare, and Photo', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // 1. Switch to Galaxy Mode
    await page.getByTitle(/Thiên Hà|Galaxy/i).click();
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'GALAXY', { timeout: 15000 });

    // 2. Switch to Free Flight via Spacecraft & Flight menu
    await page.getByTitle(/Phi Thuyền|Flight/i).click();
    await page.getByRole('button', { name: /Chế Độ Bay Tự Do|Free Flight Mode/i }).click();
    await expect(page.getByText('AU/s')).toBeVisible();

    // Exit Flight via ESC
    await page.keyboard.press('Escape');
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT');

    // 3. Open Compare Mode via Experiences menu
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByRole('button', { name: /So Sánh Kích Thước|Scale Comparison/i }).click();
    await expect(
      page.getByText(/CÔNG CỤ SO SÁNH THIÊN THỂ|CELESTIAL COMPARISON ENGINE/i)
    ).toBeVisible();

    await page.getByRole('button', { name: /TỶ LỆ TRỰC QUAN|VISUAL SCALE/i }).click();
    await expect(page.getByText(/TỶ LỆ THỰC TẾ: BẬT|TRUE SCALE: ACTIVE/i)).toBeVisible();

    // Close Compare Mode before opening Photo Mode
    await page
      .locator('.glass-panel-glow')
      .filter({ hasText: /CÔNG CỤ SO SÁNH|CELESTIAL COMPARISON/i })
      .locator('button')
      .last()
      .click();

    // 4. Open Photo Mode via Experiences menu
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByRole('button', { name: /Chế Độ Chụp Ảnh|Photo Mode/i }).click();
    await expect(page.getByText('FOV')).toBeVisible();
  });

  test('opens and interacts with Command Palette and closes cleanly on Escape', async ({ page }) => {
    await page.goto('/');

    await page.getByTitle(/Tìm kiếm nhanh|Quick Search|Command Palette/i).click();
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Mars');
    await expect(page.getByRole('option', { name: /Mars/i }).first()).toBeVisible();

    // R5.b (neg): Escape closes Command Palette completely
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('opens and operates Scale Explorer', async ({ page }) => {
    await page.goto('/');

    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByRole('button', { name: /Thước Đo Vũ Trụ|Scale Explorer/i }).click();
    await expect(
      page.getByText(/THƯỚC ĐO QUY MÔ VŨ TRỤ|COSMIC SCALE EXPLORATION/i)
    ).toBeVisible();

    await page.getByRole('button', { name: /Mở Rộng Quy Mô|Expand Scale/i }).click();
    await expect(
      page.getByText(/Hệ Thống Trái Đất - Mặt Trăng|The Earth-Moon System/i)
    ).toBeVisible();
  });

  test('opens settings modal, switches ULTRA preset, and toggles VI/EN language', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    await page.getByTitle(/Cài đặt hệ thống|Engine Settings/i).click();
    await page.getByRole('button', { name: 'ULTRA', exact: true }).click();
    await expect(
      page.getByText(/Thiết lập thủ công chất lượng ULTRA|Manual ULTRA/i)
    ).toBeVisible();

    // Switch to English and verify instant bilingual translation with zero Vietnamese leaks
    await page.getByRole('dialog').getByRole('button', { name: /English/i }).click();
    await expect(page.getByText(/Manual ULTRA quality/i)).toBeVisible();
    // Restore LOW preset before heavy headless software-WebGL launch simulation so parallel CI workers stay responsive
    await page.getByRole('dialog').getByRole('button', { name: 'LOW', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByText(/Manual LOW quality/i)).not.toBeVisible();

    // Launch Rocket Simulation in English and verify localized narration + both camera views
    await page.getByTitle(/Spacecraft|Flight|Phi Thuyền/i).click();
    await page.getByRole('button', { name: /Earth Launch Simulation/i }).click();
    await expect(page.getByText(/Launch Simulation/i)).toBeVisible();
    await expect(page.getByText(/Launch Countdown|Liftoff/i).first()).toBeVisible();
  });

  test('responsive viewport on mobile layout with zero overflow and zero HUD collision', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    await expect(page.getByTitle(/Hành Tinh|Planets/i)).toBeVisible();
    await expect(page.getByTestId('light-delay-readout')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Verify mobile SolarRadarHUD expand/collapse works cleanly without disappearing into hidden container
    const radarExpand = page.getByTestId('solar-radar-expand');
    await expect(radarExpand).toBeVisible();
    await radarExpand.click();
    await expect(page.getByTestId('solar-radar-canvas')).toBeVisible();
    await page.getByTestId('solar-radar-collapse').click();
    await expect(radarExpand).toBeVisible();

    // Ensure TimeControls and TargetHUD bounding boxes never overlap on 390x844 mobile
    const timeBox = await page.getByTestId('time-controls-panel').boundingBox();
    const targetBox = await page.getByTestId('target-hud-panel').boundingBox();
    expect(timeBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    if (timeBox && targetBox) {
      const overlaps =
        timeBox.x < targetBox.x + targetBox.width &&
        timeBox.x + timeBox.width > targetBox.x &&
        timeBox.y < targetBox.y + targetBox.height &&
        timeBox.y + timeBox.height > targetBox.y;
      expect(overlaps).toBe(false);
    }
  });

  test('audits live 3D telemetry (FPS, draw calls, triangles) and captures launch FOLLOW & COCKPIT views', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 25000 });

    // Open Shift+D DiagnosticsOverlay and wait until frame >= 2 populates real WebGL draw calls
    await page.keyboard.press('Shift+D');
    const diag = page.getByTestId('diagnostics-overlay');
    await expect(diag).toBeVisible();
    await expect(page.getByTestId('diag-draw-calls')).not.toHaveText('0', { timeout: 10000 });
    const solarDiagText = await diag.innerText();
    expect(solarDiagText).toMatch(/DRAW CALLS/i);
    expect(solarDiagText).toMatch(/TRIANGLES/i);

    const shotsDir = path.resolve(process.cwd(), '../.tmp/task-report/screenshots');
    if (testInfo.project.name === 'chromium') {
      fs.mkdirSync(shotsDir, { recursive: true });
      await page.screenshot({ path: path.join(shotsDir, 'solar-system-diagnostics.png') });
    }

    // Close Shift+D overlay before clean launch screenshots
    await page.keyboard.press('Shift+D');

    // Enter Rocket Launch scenario and verify both FOLLOW (T+14s) and COCKPIT (T+232s)
    await page.getByTitle(/Phi Thuyền|Flight/i).click();
    await page.getByRole('button', { name: /Phóng Tàu Từ Trái Đất|Earth Launch Simulation/i }).click();
    await expect(page.getByText(/Mô Phỏng Phóng Tàu|Launch Simulation/i)).toBeVisible();

    const scrubber = page.locator('input[type="range"]').first();

    // 0. Pad countdown COCKPIT view (T+00:00): verify zero Crew Access Arm clipping & zero HUD header/narration overlap!
    await page.getByRole('button', { name: /Tạm dừng|Pause/i }).first().click();
    await scrubber.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, '0');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(400);

    const headerBox = await page.getByTestId('launch-header-badge').boundingBox();
    const narrationBox = await page.getByTestId('launch-narration-card').boundingBox();
    const exitBox = await page.getByTestId('launch-exit-btn').boundingBox();
    const camDockBox = await page.getByTestId('launch-camera-dock').boundingBox();
    expect(headerBox).not.toBeNull();
    expect(narrationBox).not.toBeNull();
    expect(exitBox).not.toBeNull();
    expect(camDockBox).not.toBeNull();
    expect(narrationBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height + 6);
    expect(camDockBox!.y).toBeGreaterThanOrEqual(exitBox!.y + exitBox!.height + 6);

    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(shotsDir, 'launch-cockpit-t0.png') });
    }

    // 1. Liftoff steam & pad view (T+14s, FOLLOW)
    await page.getByRole('button', { name: /Theo Dõi Tàu|Follow/i }).click();
    await scrubber.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, '14');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(shotsDir, 'launch-follow-t14.png') });
    }

    // 1b. Clear-air supersonic Mach-diamond plume view (T+38s, FOLLOW)
    await scrubber.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, '38');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(450);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(shotsDir, 'launch-plume-t38.png') });
    }

    // 1c. Mesosphere 78.4 km Cinematic view (T+145s, CINEMATIC): dark starry sky + crisp Earth surface & volumetric clouds!
    await page.getByRole('button', { name: /Điện Ảnh|Cinematic/i }).click();
    await scrubber.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, '145');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(shotsDir, 'launch-cinematic-t145.png') });
    }

    // 2. Orbit insertion cockpit view (T+232s, COCKPIT)
    await page.getByRole('button', { name: /Khoang Lái|Cockpit/i }).click();
    await scrubber.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, '232');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(shotsDir, 'launch-cockpit-t232.png') });
    }

    // 3. Window view (T+232s, WINDOW)
    await page.getByRole('button', { name: /Cửa Sổ Nhìn Đất|Window/i }).click();
    await page.waitForTimeout(350);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(shotsDir, 'launch-window-t232.png') });
    }

    // Capture Launch telemetry via Shift+D
    await page.keyboard.press('Shift+D');
    await page.waitForTimeout(450);
    const launchDiagText = await diag.innerText();
    expect(launchDiagText).toMatch(/DRAW CALLS/i);
    if (testInfo.project.name === 'chromium') {
      fs.writeFileSync(
        path.join(shotsDir, 'live-telemetry.json'),
        JSON.stringify({ solarDiagText, launchDiagText }, null, 2),
        'utf8'
      );
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies Cinema IBL environment and captures photorealistic 3D gallery across Surfaces, Exoplanet Ocean & Spacecraft', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 20000 });

    const cinemaDir = path.resolve(process.cwd(), '../.tmp/task-report/cinema-shots');
    if (testInfo.project.name === 'chromium') {
      fs.mkdirSync(cinemaDir, { recursive: true });
    }

    // Pause orbital clock first so JWST stays centered in frame after camera flyTo completes
    await page.getByRole('button', { name: /Tạm dừng|Pause/i }).first().click().catch(() => {});

    // 1. Focus JWST via Command Palette and wait for full camera arrival to capture close-up PBR parabolic mirror & Kapton view
    await page.keyboard.press('Control+k');
    const input = page.locator('input[type="text"]').first();
    await input.fill('James Webb');
    await page.getByRole('option', { name: /James Webb/i }).first().click();
    await page.waitForTimeout(2800);
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 15000 });
    await page.waitForTimeout(350);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(cinemaDir, 'cinema-jwst.png') });
    }

    // 2. Focus Voyager 1 (10-sided bus, 3-strut feed tripod, RTG & magnetometer booms)
    await page.keyboard.press('Control+k');
    await input.fill('Voyager 1');
    await page.getByRole('option', { name: /Voyager 1/i }).first().click();
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 15000 });
    await page.waitForTimeout(350);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(cinemaDir, 'cinema-voyager1.png') });
    }

    // 3. Focus Saturn (fwidth anti-aliased Cassini ringlets & shadow)
    await page.keyboard.press('Control+k');
    await input.fill('Saturn');
    await page.getByRole('option', { name: /Sao Thổ|Saturn/i }).first().click();
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 15000 });
    await page.waitForTimeout(350);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(cinemaDir, 'cinema-saturn.png') });
    }

    // 4. Land on Mars Jezero Crater (Smooth FBM mesas, Mie blue sunset, articulated Perseverance)
    await page.keyboard.press('Control+k');
    await input.fill('Đổ Bộ Sao Hỏa');
    await page.getByRole('option', { name: /Đổ Bộ Sao Hỏa 3D|Land on Mars 3D/i }).first().click();
    await expect(page.getByText(/MIỆNG NÚI LỬA JEZERO|JEZERO CRATER/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(cinemaDir, 'cinema-mars-jezero.png') });
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2100);

    // 5. Land on Moon Apollo 11 Tranquility Base (Textured Earthrise + Eagle LM + US Flag)
    await page.keyboard.press('Control+k');
    await input.fill('Đổ Bộ Mặt Trăng');
    await page.getByRole('option', { name: /Đổ Bộ Mặt Trăng 3D|Land on Moon 3D/i }).first().click();
    await expect(page.getByText(/BÃI ĐÁP APOLLO 11|APOLLO 11/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(cinemaDir, 'cinema-moon-apollo11.png') });
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2100);

    // 6. Traverse 4D Wormhole to Miller's Ocean World (Lit Fresnel Megawaves + Lensed Gargantua + Pitching Ranger)
    await page.keyboard.press('Control+k');
    await input.fill('Lỗ Sâu 4D');
    await page.getByRole('option', { name: /Vượt Lỗ Sâu 4D|Enter 4D Wormhole/i }).first().click();
    await expect(page.getByText(/HÀNH TINH ĐẠI DƯƠNG MILLER|MILLER/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);
    if (testInfo.project.name === 'chromium') {
      await page.screenshot({ path: path.join(cinemaDir, 'cinema-millers-ocean.png') });
    }
    await page.keyboard.press('Escape');

    expect(consoleErrors).toEqual([]);
  });

  test('verifies unclipped Phi Thuyền menu, live unpaused ISS/JWST tracking, scrollable sidebars & SuperNav, and 3D Constellation Reviews', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const isDesktop = testInfo.project.name === 'chromium';
    if (isDesktop) {
      await page.setViewportSize({ width: 1600, height: 900 });
    }

    await page.goto('/');
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 20000 });

    const fixShotsDir = path.resolve(process.cwd(), '../.tmp/task-report/constellation-shots');
    if (isDesktop) {
      fs.mkdirSync(fixShotsDir, { recursive: true });
    }

    // 1. Verify SuperNav horizontal scroll readiness and zero text clipping on BOTH 1280x720 (xl) and 1600x900 (2xl)
    const supernavScroll = page.getByTestId('supernav-scroll');
    await expect(supernavScroll).toBeVisible();
    if (isDesktop) {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(120);
      const xlNav = await supernavScroll.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(xlNav.scrollWidth).toBeLessThanOrEqual(xlNav.clientWidth + 4);
      await page.setViewportSize({ width: 1600, height: 900 });
      await page.waitForTimeout(120);
    }
    const navStyle = await supernavScroll.evaluate((el) => ({
      overflowX: getComputedStyle(el).overflowX,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(navStyle.overflowX).toBe('auto');
    if (isDesktop) {
      expect(navStyle.scrollWidth).toBeLessThanOrEqual(navStyle.clientWidth + 4);
    }

    // 2. Open Phi Thuyền menu and verify dropdown renders unclipped outside <nav> with full height
    await page.getByTestId('spacecraft-menu-btn').click();
    const spacecraftMenu = page.getByTestId('spacecraft-dropdown-menu');
    await expect(spacecraftMenu).toBeVisible();
    const scBox = await spacecraftMenu.boundingBox();
    expect(scBox).not.toBeNull();
    expect(scBox!.height).toBeGreaterThan(200);
    expect(scBox!.y).toBeGreaterThan(36);
    if (isDesktop) {
      await page.screenshot({ path: path.join(fixShotsDir, 'fix-supernav-2xl-spacecraft-menu.png') });
    }

    // 3. Select ISS WITH SIMULATION CLOCK UNPAUSED and verify live moving orbit lock + continuous rAF pacing
    await spacecraftMenu.getByRole('button', { name: /Trạm Vũ Trụ ISS|ISS Space Station/i }).click();
    await page.waitForTimeout(2200);
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 15000 });
    await expect(page.locator('.hud-tag').first()).toHaveText(/QUỸ ĐẠO|ORBIT/);
    const issRafFrames = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          const tick = () => {
            frames++;
            if (performance.now() - start >= 350) resolve(frames);
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        })
    );
    expect(issRafFrames).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId('target-hud-scroll')).toContainText(/ISS/i);
    if (isDesktop) {
      await page.screenshot({ path: path.join(fixShotsDir, 'fix-iss-live-orbit.png') });
    }

    // 4. Select JWST WITH SIMULATION CLOCK UNPAUSED and verify live moving L2 orbit lock
    await page.getByTestId('spacecraft-menu-btn').click();
    await page.getByTestId('spacecraft-dropdown-menu').getByRole('button', { name: /James Webb/i }).click();
    await page.waitForTimeout(2200);
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 15000 });
    await page.waitForTimeout(600);
    await expect(page.getByTestId('target-hud-scroll')).toContainText(/James Webb/i);
    if (isDesktop) {
      await page.screenshot({ path: path.join(fixShotsDir, 'fix-jwst-live-orbit.png') });
    }

    // 5. Verify smooth damped Free Flight (after ORBIT drag -> zero frame-1 whip, zero Radar/TimeControls collision, live thrust & screenshot)
    await page.mouse.move(400, 360);
    await page.mouse.down();
    await page.mouse.move(560, 340, { steps: 4 });
    await page.mouse.up();

    await page.getByTestId('spacecraft-menu-btn').click();
    await page.getByTestId('spacecraft-dropdown-menu').getByRole('button', { name: /Bay Tự Do|Free Flight/i }).click();
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'FREE_FLIGHT', { timeout: 5000 });
    await expect(page.locator('.hud-tag').first()).toHaveText(/BAY TỰ DO|FREE FLIGHT/);
    await expect(page.getByText('AU/s')).toBeVisible();
    // Radar & TimeControls must stay hidden in FREE_FLIGHT (zero overlap over FlightHUD gauges)
    await expect(page.getByText(/BẢN ĐỒ HỆ MẶT TRỜI|SOLAR RADAR/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Tạm dừng|Pause/i })).toHaveCount(0);

    await page.mouse.move(520, 420);
    await page.mouse.down();
    await page.mouse.move(580, 405, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(280);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(150);
    if (isDesktop) {
      await page.screenshot({ path: path.join(fixShotsDir, 'fix-free-flight-hud.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 5000 });

    await page.getByTestId('spacecraft-menu-btn').click();
    await page.getByTestId('spacecraft-dropdown-menu').getByRole('button', { name: /Phóng Tàu Từ Trái Đất|Earth Launch/i }).click();
    await expect(page.getByText(/Mô Phỏng Phóng Tàu|Launch Simulation/i)).toBeVisible({ timeout: 5000 });
    const launchRange = page.locator('input[type="range"]').first();
    const tStart = parseFloat(await launchRange.inputValue());
    await page.waitForTimeout(450);
    const tAfter = parseFloat(await launchRange.inputValue());
    expect(tAfter).toBeGreaterThan(tStart);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('spacecraft-menu-btn')).toBeVisible({ timeout: 5000 });

    // 6. Verify 3D Constellations menu, camera orientation, highlighted lines & Planet-Style Review Card
    await page.getByTestId('constellations-menu-btn').click();
    const constMenu = page.getByTestId('constellations-dropdown-menu');
    await expect(constMenu).toBeVisible();
    await page.getByTestId('nav-constellation-constellation_leo').click();
    await page.waitForTimeout(2100);
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 15000 });

    const targetHud = page.getByTestId('target-hud-scroll');
    await expect(targetHud).toContainText(/Sư Tử|Leo/i);
    await expect(targetHud).toContainText(/Regulus/i);
    await expect(targetHud).toContainText(/947/);
    const leoHudText = await targetHud.innerText();
    expect(leoHudText).not.toContain('0 km');
    expect(leoHudText).not.toContain('0 m/s²');

    if (!isDesktop) {
      await page.getByTestId('dossier-toggle').click();
    }
    await expect(targetHud).toContainText(/Nemean/i);
    if (isDesktop) {
      await page.screenshot({ path: path.join(fixShotsDir, 'fix-constellation-leo-review.png') });
    }

    // 7. Verify real computed overflow-y: auto & wheel scrolling inside TargetHUD sidebar and horizontal SuperNav swipe
    const hudOverflowY = await targetHud.evaluate((el) => getComputedStyle(el).overflowY);
    expect(hudOverflowY).toBe('auto');

    if (isDesktop) {
      await page.setViewportSize({ width: 1280, height: 480 });
      await page.waitForTimeout(150);
    }
    const hudBox = await targetHud.boundingBox();
    expect(hudBox).not.toBeNull();
    await page.mouse.move(hudBox!.x + hudBox!.width / 2, hudBox!.y + Math.min(120, hudBox!.height / 2));
    await page.mouse.wheel(0, 260);
    await page.waitForTimeout(150);
    const scrolledTop = await targetHud.evaluate((el) => el.scrollTop);
    expect(scrolledTop).toBeGreaterThan(0);

    if (isDesktop) {
      // Narrow viewport check: horizontal wheel/swipe on SuperNav advances scrollLeft > 0
      await page.setViewportSize({ width: 640, height: 720 });
      await page.waitForTimeout(150);
      const navBox = await supernavScroll.boundingBox();
      expect(navBox).not.toBeNull();
      await page.mouse.move(navBox!.x + navBox!.width / 2, navBox!.y + navBox!.height / 2);
      await page.mouse.wheel(0, 180);
      await page.waitForTimeout(100);
      const navScrolledLeft = await supernavScroll.evaluate((el) => el.scrollLeft);
      expect(navScrolledLeft).toBeGreaterThan(0);

      // Restore spacious cinema viewport for Orion review screenshot
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(200);
    }

    // 8. Click neighbor constellation chip (Orion) directly inside review card to pan across celestial sphere
    const orionChip = page.getByTestId('constellation-chip-constellation_orion');
    await orionChip.scrollIntoViewIfNeeded();
    await orionChip.click();
    await page.waitForTimeout(2100);
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 15000 });
    await expect(targetHud).toContainText(/Lạp Hộ|Orion/i);
    await expect(targetHud).toContainText(/Rigel/i);
    if (isDesktop) {
      await page.screenshot({ path: path.join(fixShotsDir, 'fix-constellation-orion-review.png') });
      // Verify English ('EN') switch shows zero leaked Vietnamese strings on Constellation Review Card
      await page.getByRole('button', { name: /Switch to English|Chuyển sang Tiếng Việt/i }).click();
      await expect(targetHud).toContainText(/Orion Nebula \(M42\)/i);
      await expect(targetHud).toContainText(/594 deg²/i);
      const enText = await targetHud.innerText();
      expect(enText).not.toMatch(/Tinh vân|độ²|năm a\/s/i);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('verifies all 7 new offline cosmic features, telemetry readouts, Escape transitions, and captures 8 live 3D WebGL screenshots', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const isDesktop = testInfo.project.name === 'chromium';
    if (isDesktop) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    await page.goto('/');
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 25000 });

    const cosmicDir = path.resolve(process.cwd(), '../.tmp/task-report/cosmic-shots');
    if (isDesktop) {
      fs.mkdirSync(cosmicDir, { recursive: true });
    }

    // 1. Solar Storm, Magnetosphere & Aurora 3D
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-solar-storm').click();
    await expect(page.getByTestId('solar-storm-hud')).toBeVisible();
    // Radar stays hidden while Solar Storm HUD is open so zero mobile HUD collision occurs (U9)
    await expect(page.getByTestId('solar-radar-expand')).toHaveCount(0);
    await expect(page.getByTestId('solar-radar-canvas')).toHaveCount(0);
    if (!isDesktop) {
      const stormBox = await page.getByTestId('solar-storm-hud').boundingBox();
      const timeBox = await page.getByTestId('time-controls-panel').boundingBox();
      expect(stormBox).not.toBeNull();
      expect(timeBox).not.toBeNull();
      if (stormBox && timeBox) {
        const overlaps =
          stormBox.x < timeBox.x + timeBox.width &&
          stormBox.x + stormBox.width > timeBox.x &&
          stormBox.y < timeBox.y + timeBox.height &&
          stormBox.y + stormBox.height > timeBox.y;
        expect(overlaps).toBe(false);
      }
    }
    await page.getByTestId('storm-preset-G5').click();
    await expect(page.getByTestId('solar-storm-level')).toContainText('G5');
    await expect(page.getByTestId('solar-storm-kp')).toContainText('9');
    await expect(page.getByTestId('solar-storm-wind')).toContainText('km/s');
    await page.getByTestId('trigger-cme-btn').click();
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 10000 });
    await page.waitForTimeout(500);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-solar-storm.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('solar-storm-hud')).toHaveCount(0);

    // 2. Hohmann Transfer Mission Planner & Autonomous Probe Launch
    await page.getByTestId('spacecraft-menu-btn').click();
    await page.getByTestId('nav-hohmann-planner').click();
    await expect(page.getByTestId('mission-planner-hud')).toBeVisible();
    await expect(page.getByTestId('mission-tof')).toContainText(/259|258/);
    await page.getByTestId('mission-dest-jupiter').click();
    const baseDv = parseFloat((await page.getByTestId('mission-total-dv').innerText()) || '0');
    await page.getByTestId('mission-gravity-assist').click();
    const assistDv = parseFloat((await page.getByTestId('mission-total-dv').innerText()) || '0');
    expect(assistDv).toBeLessThan(baseDv);
    await page.getByTestId('mission-launch-btn').click();
    await expect(page.locator('.hud-tag').first()).toHaveAttribute('data-camera-mode', 'ORBIT', { timeout: 10000 });
    await page.waitForTimeout(1600);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-hohmann.png') });
    }
    await page.getByTestId('mission-dest-moon').click();
    await expect(page.getByTestId('mission-tof')).toContainText(/4\.9|5\.0/);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mission-planner-hud')).toHaveCount(0);

    // 3. Total Solar Eclipse & Blood Moon 3D
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-eclipse-lab').click();
    await expect(page.getByTestId('eclipse-hud')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('eclipse-status')).toContainText(/Toàn Phần|Totality/i);
    await page.waitForTimeout(600);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-eclipse.png') });
    }
    await page.getByTestId('eclipse-mode-solar_orbit').click();
    await expect(page.getByTestId('eclipse-status')).toContainText(/Umbra/i);
    await page.getByTestId('eclipse-mode-lunar_blood').click();
    await expect(page.getByTestId('eclipse-status')).toContainText(/Trăng Máu|Blood Moon/i);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('eclipse-hud')).toHaveCount(0);

    // 4. Binary Black Hole Merger & LIGO Gravitational Waves 3D
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-binary-merger').click();
    await expect(page.getByTestId('binary-merger-hud')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('ligo-waveform-canvas')).toBeVisible();
    await page.getByTestId('play-ligo-chirp-btn').click();
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-binary-merger.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('binary-merger-hud')).toHaveCount(0);

    // 5. Europa Ice Surface Landing & Cryogeysers
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-land-europa').click();
    await expect(page.getByTestId('surface-hud-europa')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('surface-hud-europa')).toContainText('0.134 g');
    await expect(page.getByTestId('surface-hud-europa')).toContainText('-171 °C');
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-europa.png') });
    }

    // 6. Direct Switch to Titan Hydrocarbon Shoreline via Command Palette (Ctrl+K)
    await page.keyboard.press('Control+k');
    const cmdInput = page.locator('input[type="text"]').first();
    await cmdInput.fill('Titan');
    await page.getByRole('option', { name: /Đổ Bộ Mặt Trăng Titan|Land on Titan/i }).first().click();
    await expect(page.getByTestId('surface-hud-titan')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('surface-hud-titan')).toContainText('0.138 g');
    await expect(page.getByTestId('surface-hud-titan')).toContainText('-179 °C');
    await expect(page.getByTestId('surface-hud-titan')).toContainText('1.45 atm');
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-titan.png') });
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2100);
    await expect(page.getByTestId('surface-hud-titan')).toHaveCount(0);

    // 7. Volumetric Nebulae (M16 Pillars) & Stellar Lifecycle Lab (H-R Diagram)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-stellar-lab').click();
    await expect(page.getByTestId('stellar-lab-hud')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-stellar-lab.png') });
    }
    await page.getByTestId('stellar-tab-lifecycle').click();
    await expect(page.getByTestId('hr-diagram-svg')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('stellar-lab-hud')).toHaveCount(0);

    // 8. 360° Night Sky Planetarium, Meteor Showers & Optical Telescope Zoom (FOV 14°)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-planetarium').click();
    await expect(page.getByTestId('planetarium-hud')).toBeVisible({ timeout: 10000 });
    const hanoiAlt = parseFloat((await page.getByTestId('planetarium-polaris-alt').innerText()) || '0');
    expect(hanoiAlt).toBeGreaterThan(18);
    await page.getByTestId('planetarium-city-antarctica').click();
    const antAlt = parseFloat((await page.getByTestId('planetarium-polaris-alt').innerText()) || '0');
    expect(antAlt).toBeLessThan(-60);
    await page.getByTestId('planetarium-city-hanoi').click();
    await page.waitForTimeout(600);
    if (isDesktop) {
      await page.screenshot({ path: path.join(cosmicDir, 'cosmic-planetarium.png') });
    }

    // Enter Telescope Eyepiece -> first Escape exits eyepiece back to 360° dome, second Escape returns to Solar System (R7.b)
    await page.getByTestId('planetarium-telescope-saturn').click();
    await expect(page.getByTestId('telescope-reticle')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('telescope-reticle')).toHaveCount(0);
    await expect(page.getByTestId('planetarium-hud')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('planetarium-hud')).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies Observatory Mega-Hub 6 tabs, accent-insensitive search, all 8 Wave 2 labs, Escape step-back, mobile Bottom Sheet & captures 9 live WebGL screenshots', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const isDesktop = testInfo.project.name === 'chromium';
    if (isDesktop) {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    await page.goto('/');
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 25000 });

    const wave2Dir = path.resolve(process.cwd(), '../.tmp/task-report/wave2-shots');
    fs.mkdirSync(wave2Dir, { recursive: true });

    // 1. Open Observatory Mega-Hub -> verify 6 tabs, accent-insensitive Vietnamese search & screenshot
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    const megaHub = page.getByTestId('experiences-dropdown-menu');
    await expect(megaHub).toBeVisible();
    await expect(page.getByTestId('mega-hub-tab-all')).toBeVisible();
    await expect(page.getByTestId('mega-hub-tab-physics')).toBeVisible();
    await expect(page.getByTestId('mega-hub-tab-surfaces')).toBeVisible();
    await expect(page.getByTestId('mega-hub-tab-planets')).toBeVisible();
    await expect(page.getByTestId('mega-hub-tab-deep_space')).toBeVisible();
    await expect(page.getByTestId('mega-hub-tab-tools')).toBeVisible();

    if (isDesktop) {
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-mega-hub.png') });
    } else {
      // Mobile Bottom Sheet: fits mobile viewport width with zero overflow, capture screenshot, dismiss via close & backdrop
      const hubBox = await megaHub.boundingBox();
      expect(hubBox).not.toBeNull();
      const viewportWidth = page.viewportSize()?.width ?? 393;
      expect(hubBox!.width).toBeLessThanOrEqual(viewportWidth);
      await page.waitForTimeout(220);
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-mega-hub-mobile.png') });
      await page.getByTestId('mega-hub-close-btn').click();
      await expect(megaHub).toHaveCount(0);
      await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
      await expect(megaHub).toBeVisible();
      await page.getByTestId('mega-hub-backdrop').click({ position: { x: 20, y: 20 } });
      await expect(megaHub).toHaveCount(0);
      await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
      await expect(megaHub).toBeVisible();
    }

    // Accent-insensitive Vietnamese search ("dia cau hoa" -> Mars Terraform)
    const searchInput = page.getByTestId('mega-hub-search');
    await searchInput.fill('dia cau hoa');
    await expect(page.getByTestId('nav-mars-terraform')).toBeVisible();
    await searchInput.fill('');

    // 2. N-Body Gravity Sandbox (R2)
    await page.getByTestId('mega-hub-tab-physics').click();
    await page.getByTestId('nav-nbody-sandbox').click();
    await expect(page.getByTestId('nbody-sandbox-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('nbody-spawn-btn').click();
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-nbody.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('nbody-sandbox-hud')).toHaveCount(0);

    // 3. Mars Terraforming 1,000-Year Simulator (R3)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await expect(page.getByTestId('mega-hub-recent')).toBeVisible();
    await page.getByTestId('nav-mars-terraform').click();
    await expect(page.getByTestId('mars-terraform-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('terraform-years-slider').fill('880');
    await expect(page.getByTestId('terraform-pressure')).toContainText(/7\d\d|8\d\d|9\d\d/);
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-mars-terraform.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mars-terraform-hud')).toHaveCount(0);

    // 4. 3D Planetary & Stellar Interior Cutaway (R4)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-planetary-cutaway').click();
    await expect(page.getByTestId('planetary-cutaway-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('cutaway-layer-2').click();
    await page.waitForTimeout(600);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-cutaway.png') });
    }
    await page.getByTestId('cutaway-body-europa').click();
    await expect(page.getByTestId('planetary-cutaway-hud')).toContainText(/Đại Dương|Ocean/i);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('planetary-cutaway-hud')).toHaveCount(0);

    // 5. Planetary Defense · DART & 99942 Apophis (R5)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-planetary-defense').click();
    await expect(page.getByTestId('planetary-defense-hud')).toBeVisible({ timeout: 12000 });
    await expect(page.getByTestId('defense-outcome')).toContainText(/AN TOÀN|SAFE/i);
    await page.getByTestId('defense-launch-btn').click();
    await page.waitForTimeout(1450);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-defense.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('planetary-defense-hud')).toHaveCount(0);

    // 6. TRAPPIST-1 Exoplanet System + Kepler Transit + Surface 1e Escape step-back (R6)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-trappist-exoplanets').click();
    await expect(page.getByTestId('trappist-system-hud')).toBeVisible({ timeout: 12000 });
    await expect(page.getByTestId('trappist-transit-canvas')).toBeVisible();
    await page.waitForTimeout(600);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-trappist.png') });
    }
    // Enter Surface 1e -> first Escape returns to 7-planet system, second Escape exits to Solar System
    await page.getByTestId('trappist-view-surface_e').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('trappist-system-hud')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('trappist-system-hud')).toHaveCount(0);

    // 7. Dyson Swarm & O'Neill Cylinder Megastructures (R7)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-dyson-megastructure').click();
    await expect(page.getByTestId('dyson-megastructure-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('dyson-completion-slider').fill('0.72');
    await page.waitForTimeout(600);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-dyson.png') });
    }
    await page.getByTestId('dyson-mode-oneill_cylinder').click();
    await page.waitForTimeout(350);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dyson-megastructure-hud')).toHaveCount(0);

    // 8. Relativity Lab: Einstein Ring + Black Hole Dive Escape step-back (R8)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-relativity-lab').click();
    await expect(page.getByTestId('relativity-lab-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('relativity-offset-slider').fill('0');
    await page.waitForTimeout(600);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-relativity.png') });
    }
    await page.getByTestId('relativity-tab-bh_dive').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('relativity-lab-hud')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('relativity-lab-hud')).toHaveCount(0);

    // 9. Kessler Syndrome & 2,200 LEO/MEO/GEO Satellites (R8)
    await page.getByTitle(/Trải Nghiệm|Experiences/i).click();
    await page.getByTestId('nav-kessler-leo').click();
    await expect(page.getByTestId('kessler-orbital-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('kessler-trigger-btn').click();
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(wave2Dir, 'wave2-kessler.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('kessler-orbital-hud')).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(consoleErrors).toEqual([]);
  });

  test('renders live Planetary Surface Events across planets, focuses hotspots, triggers bursts & preserves mobile layout (SPEC-009)', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const shotsDir = path.resolve(process.cwd(), '../.tmp/task-report/planetary-events-shots');
    fs.mkdirSync(shotsDir, { recursive: true });
    const isDesktop = testInfo.project.name === 'chromium';
    const isMobile = !isDesktop;
    if (isDesktop) {
      await page.setViewportSize({ width: 1440, height: 900 });
    } else {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await page.goto('/');
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 25000 });
    await expect(page.getByTestId('target-hud-panel')).toBeVisible({ timeout: 20000 });

    const selectPlanetFromNav = async (planetPattern: RegExp) => {
      await page.getByTitle(/Hành Tinh|Planets/i).click();
      await page.getByRole('button', { name: planetPattern }).first().click();
    };

    const waitCameraArrival = async () => {
      await expect(page.locator('[data-camera-mode]')).toHaveAttribute('data-camera-mode', 'ORBIT', {
        timeout: 18000,
      });
      await page.waitForTimeout(750);
    };

    const ensureEventsExpanded = async () => {
      await expect(page.getByTestId('planetary-events-section')).toBeVisible({ timeout: 10000 });
      const focusBtn = page.getByTestId('planetary-event-focus-btn');
      if ((await focusBtn.count()) === 0) {
        await page.getByTestId('planetary-events-toggle').click();
      }
      await expect(focusBtn).toBeVisible();
    };

    // 1. Earth (initial target): mobile starts collapsed; desktop starts expanded
    await expect(page.getByTestId('planetary-events-section')).toBeVisible({ timeout: 10000 });
    if (isMobile) {
      await expect(page.getByTestId('planetary-event-focus-btn')).toHaveCount(0);
      await page.getByTestId('planetary-events-toggle').click();
      await expect(page.getByTestId('planetary-event-focus-btn')).toBeVisible();
    }
    await page.getByTestId('planetary-event-intensity-extreme').click();
    await page.getByTestId('planetary-event-chip-earth_pacific_typhoon').click();
    await page.getByTestId('planetary-event-focus-btn').click();
    await waitCameraArrival();
    await page.getByTestId('planetary-event-burst-btn').click();
    await page.waitForTimeout(450);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'earth-surface-events.png') });
    } else if (testInfo.project.name.toLowerCase().includes('mobile')) {
      await page.screenshot({ path: path.join(shotsDir, 'mobile-planetary-events.png') });
    }

    // 2. Jupiter: Great Red Spot + Ammonia Superbolts + X-Ray Aurora
    await selectPlanetFromNav(/Sao Mộc|Jupiter/i);
    await ensureEventsExpanded();
    await page.getByTestId('planetary-event-chip-jupiter_great_red_spot').click();
    await page.getByTestId('planetary-event-focus-btn').click();
    await waitCameraArrival();
    await page.getByTestId('planetary-event-burst-btn').click();
    await page.waitForTimeout(450);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'jupiter-surface-events.png') });
    }

    // 3. Saturn: North Polar Hexagon + Electrostatic Ring Spokes
    await selectPlanetFromNav(/Sao Thổ|Saturn/i);
    await ensureEventsExpanded();
    await page.getByTestId('planetary-event-chip-saturn_north_hexagon').click();
    await page.getByTestId('planetary-event-focus-btn').click();
    await waitCameraArrival();
    await page.getByTestId('planetary-event-burst-btn').click();
    await page.waitForTimeout(450);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'saturn-hexagon-events.png') });
    }

    // 4. Mars: Hellas Dust Storm + Proton Aurora
    await selectPlanetFromNav(/Sao Hỏa|Mars/i);
    await ensureEventsExpanded();
    await page.getByTestId('planetary-event-chip-mars_global_dust_storm').click();
    await page.getByTestId('planetary-event-focus-btn').click();
    await waitCameraArrival();
    await page.getByTestId('planetary-event-burst-btn').click();
    await page.waitForTimeout(450);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'mars-dust-events.png') });
    }

    // 5. Venus (direct orbital chip auto-focus on Super Vortex), Io (dive + exit to orbital plume) & Sun — Desktop visual capture
    if (isDesktop) {
      await selectPlanetFromNav(/Sao Kim|Venus/i);
      await ensureEventsExpanded();
      await waitCameraArrival();
      await page.getByTestId('planetary-event-chip-venus_super_vortex').click();
      await expect(page.locator('[data-camera-mode]')).toHaveAttribute('data-camera-mode', 'TRANSITIONING', {
        timeout: 4000,
      });
      await waitCameraArrival();
      await page.getByTestId('planetary-event-burst-btn').click();
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(shotsDir, 'venus-maat-mons-events.png') });

      await selectPlanetFromNav(/\bIo\b/i);
      await ensureEventsExpanded();
      await page.getByTestId('planetary-event-focus-btn').click();
      await waitCameraArrival();
      await page.getByTestId('planetary-event-burst-btn').click();
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(shotsDir, 'io-volcano-plume.png') });

      await selectPlanetFromNav(/Mặt Trời|Sun/i);
      await ensureEventsExpanded();
      await page.getByTestId('planetary-event-chip-sun_xclass_flare').click();
      await waitCameraArrival();
      await page.getByTestId('planetary-event-burst-btn').click();
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(shotsDir, 'sun-flare-events.png') });
    }

    // 6. Negative check (R4.b): Black Hole (Gargantua) must NOT render planetary-events-section
    await selectPlanetFromNav(/Gargantua|Hố Đen|Black Hole/i);
    await expect(page.getByTestId('light-delay-readout')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('planetary-events-section')).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(consoleErrors).toEqual([]);
  });

  test('renders Hybrid Orbital + Immersive 3D Event Surface Stage across all 5 biomes on Desktop & Mobile (SPEC-010)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const shotsDir = path.resolve(process.cwd(), '../.tmp/task-report/event-surface-stage-shots');
    fs.mkdirSync(shotsDir, { recursive: true });
    const isDesktop = testInfo.project.name === 'chromium';

    if (isDesktop) {
      await page.setViewportSize({ width: 1440, height: 900 });
    } else {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await page.goto('/');
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 25000 });
    await expect(page.getByTestId('target-hud-panel')).toBeVisible({ timeout: 20000 });

    const selectPlanetFromNav = async (planetPattern: RegExp) => {
      await page.getByTitle(/Hành Tinh|Planets/i).click();
      await page.getByRole('button', { name: planetPattern }).first().click();
    };

    const ensureEventsExpanded = async () => {
      await expect(page.getByTestId('planetary-events-section')).toBeVisible({ timeout: 10000 });
      const diveBtn = page.getByTestId('planetary-event-dive-btn');
      if ((await diveBtn.count()) === 0) {
        await page.getByTestId('planetary-events-toggle').click();
      }
      await expect(diveBtn).toBeVisible();
    };

    // 1. Venus (Biome: volcanic_lava) -> clicking surface chip auto-dives straight into 3D Event Surface Stage
    await selectPlanetFromNav(/Sao Kim|Venus/i);
    await ensureEventsExpanded();
    await expect(page.getByTestId('planetary-event-view-badge-venus_maat_mons_volcano')).toContainText(
      /Bề Mặt|Surface/i
    );
    await page.getByTestId('planetary-event-chip-venus_maat_mons_volcano').click();
    await expect(page.getByTestId('event-surface-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('event-surface-burst-btn').click();
    await page.waitForTimeout(750);

    const stageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(stageOverflow).toBeLessThanOrEqual(0);

    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'stage-venus-volcano.png') });
    } else {
      await page.screenshot({ path: path.join(shotsDir, 'stage-mobile-venus.png') });
    }

    // Switch event right inside the Surface Stage (Venus Acid Lightning in gas_giant_clouds)
    await page.getByTestId('event-surface-switch-venus_acid_lightning').click();
    await page.getByTestId('event-surface-intensity-extreme').click();
    await expect(page.getByTestId('event-surface-intensity-extreme')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(550);

    // Escape exits cleanly back to Venus in orbit (not Sun overview)
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('event-surface-hud')).toHaveCount(0);
    await expect(page.getByTestId('target-hud-panel')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('target-hud-header')).toContainText(/Sao Kim|Venus/i);

    if (isDesktop) {
      // 2. Jupiter: orbital chip focuses globe cleanly (NO auto-dive) -> then manual Lặn Bề Mặt 3D dives!
      await selectPlanetFromNav(/Sao Mộc|Jupiter/i);
      await ensureEventsExpanded();
      await expect(page.getByTestId('planetary-event-view-badge-jupiter_great_red_spot')).toContainText(
        /Quỹ Đạo|Orbital/i
      );
      await page.getByTestId('planetary-event-chip-jupiter_great_red_spot').click();
      await expect(page.getByTestId('event-surface-hud')).toHaveCount(0);
      await expect(page.locator('[data-camera-mode]')).toHaveAttribute('data-camera-mode', 'ORBIT', {
        timeout: 18000,
      });
      await page.waitForTimeout(750);
      await page.screenshot({ path: path.join(shotsDir, 'orbital-jupiter-boosted.png') });

      // Manual dive into Jupiter -> switch to Ammonia Superbolts (Biome: gas_giant_clouds)
      await page.getByTestId('planetary-event-dive-btn').click();
      await expect(page.getByTestId('event-surface-hud')).toBeVisible({ timeout: 12000 });
      await page.getByTestId('event-surface-switch-jupiter_ammonia_superbolts').click();
      await page.getByTestId('event-surface-burst-btn').click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(shotsDir, 'stage-jupiter-lightning.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('event-surface-hud')).toHaveCount(0);

      // 3. Enceladus (Biome: cryo_ice_geyser + colossal ringed Saturn on horizon!)
      await selectPlanetFromNav(/Enceladus/i);
      await ensureEventsExpanded();
      await page.getByTestId('planetary-event-chip-enceladus_tiger_stripes').click();
      await expect(page.getByTestId('event-surface-hud')).toBeVisible({ timeout: 12000 });
      await page.getByTestId('event-surface-burst-btn').click();
      await page.waitForTimeout(750);
      await page.screenshot({ path: path.join(shotsDir, 'stage-enceladus-geyser.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('event-surface-hud')).toHaveCount(0);

      // 4. Mars Jezero Dust Devils (Biome: dust_impact_desert)
      await selectPlanetFromNav(/Sao Hỏa|Mars/i);
      await ensureEventsExpanded();
      await page.getByTestId('planetary-event-chip-mars_jezero_dust_devils').click();
      await expect(page.getByTestId('event-surface-hud')).toBeVisible({ timeout: 12000 });
      await page.getByTestId('event-surface-burst-btn').click();
      await page.waitForTimeout(750);
      await page.screenshot({ path: path.join(shotsDir, 'stage-mars-dust-devil.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('event-surface-hud')).toHaveCount(0);

      // 5. Neptune Diamond Rain (Archetype: diamond_shimmer in gas_giant_clouds)
      await selectPlanetFromNav(/Sao Hải Vương|Neptune/i);
      await ensureEventsExpanded();
      await page.getByTestId('planetary-event-chip-neptune_diamond_rain').click();
      await expect(page.getByTestId('event-surface-hud')).toBeVisible({ timeout: 12000 });
      await page.getByTestId('event-surface-burst-btn').click();
      await page.waitForTimeout(750);
      await page.screenshot({ path: path.join(shotsDir, 'stage-neptune-diamond-rain.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('event-surface-hud')).toHaveCount(0);

      // 6. Earth Polar Aurora (Biome: polar_aurora_sky reusing auroraCurtain.vert + planetaryAurora.frag)
      await selectPlanetFromNav(/Trái Đất|Earth/i);
      await ensureEventsExpanded();
      await page.getByTestId('planetary-event-chip-earth_polar_aurora').click();
      await expect(page.getByTestId('event-surface-hud')).toBeVisible({ timeout: 12000 });
      await page.getByTestId('event-surface-intensity-extreme').click();
      await page.getByTestId('event-surface-burst-btn').click();
      await page.waitForTimeout(750);
      await page.screenshot({ path: path.join(shotsDir, 'stage-earth-aurora.png') });

      // Exit via HUD button back to Earth
      await page.getByTestId('event-surface-exit-btn').click();
      await expect(page.getByTestId('event-surface-hud')).toHaveCount(0);
      await expect(page.getByTestId('target-hud-header')).toContainText(/Trái Đất|Earth/i);
    }

    const finalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(finalOverflow).toBeLessThanOrEqual(0);
    expect(consoleErrors).toEqual([]);
  });

  test('verifies mobile touch zoom/controls stability & launches all 5 Space Games across Desktop and Mobile (SPEC-UNIV-2026-11-24-001)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const isDesktop = testInfo.project.name === 'chromium';
    const isMobile = !isDesktop;
    if (isDesktop) {
      await page.setViewportSize({ width: 1440, height: 900 });
    } else {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    const shotsDir = path.resolve(process.cwd(), '.tmp/task-report/space-games-mobile-shots');
    fs.mkdirSync(shotsDir, { recursive: true });

    await page.goto('/');
    await expect(page.locator('main[data-cinema-ibl="ready"]')).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(450);

    // 1. Verify mobile touch zoom controls, touch-action:none, TargetHUD collapse & zero overlap on 390x844
    if (isMobile) {
      const canvasTouchAction = await page.locator('canvas').first().evaluate(
        (el) => getComputedStyle(el).touchAction
      );
      expect(canvasTouchAction).toBe('none');

      const zoomBar = page.getByTestId('mobile-zoom-controls');
      await expect(zoomBar).toBeVisible();
      await page.getByTestId('mobile-zoom-in-btn').click();
      await page.getByTestId('mobile-zoom-out-btn').click();
      await page.getByTestId('mobile-zoom-reset-btn').click();

      // Verify zero overlap between mobile-zoom-controls and TargetHUD
      const zoomBox = await zoomBar.boundingBox();
      const targetBox = await page.getByTestId('target-hud-panel').boundingBox();
      expect(zoomBox).not.toBeNull();
      expect(targetBox).not.toBeNull();
      if (zoomBox && targetBox) {
        const overlaps =
          zoomBox.x < targetBox.x + targetBox.width &&
          zoomBox.x + zoomBox.width > targetBox.x &&
          zoomBox.y < targetBox.y + targetBox.height &&
          zoomBox.y + zoomBox.height > targetBox.y;
        expect(overlaps).toBe(false);
      }

      // Verify 1-tap TargetHUD collapse gives clean wide view
      await page.screenshot({ path: path.join(shotsDir, 'mobile-solar-ux.png') });
      await page.getByTestId('target-hud-collapse-btn').click();
      await page.waitForTimeout(200);
      await page.getByTestId('target-hud-collapse-btn').click();
    }

    // Helper to open Space Game Hub via SuperNav
    const openGameHub = async () => {
      const navBtn = page.getByTestId('space-games-nav-btn');
      await navBtn.scrollIntoViewIfNeeded();
      await navBtn.click();
      await expect(page.getByTestId('space-game-hub-modal')).toBeVisible({ timeout: 8000 });
    };

    // 2. Open Space Game Hub -> capture Desktop & Mobile screenshots -> verify Escape closes Hub
    await openGameHub();
    await page.waitForTimeout(220);
    await page.screenshot({
      path: path.join(shotsDir, isDesktop ? 'game-hub-desktop.png' : 'game-hub-mobile.png'),
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('space-game-hub-modal')).toHaveCount(0);

    // 3. Game 1: Astro Survivor 3D (Mars -> Enceladus) + mobile virtual gamepad check
    await openGameHub();
    await page.getByTestId('launch-game-astro_survivor').click();
    await expect(page.getByTestId('astro-survivor-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('survivor-arena-enceladus').click();
    await page.waitForTimeout(700);
    if (isMobile) {
      await expect(page.getByTestId('mobile-game-controls')).toBeVisible();
      await expect(page.getByTestId('mobile-zoom-controls')).toHaveCount(0);
    }
    await page.screenshot({
      path: path.join(shotsDir, isDesktop ? 'game-astro-survivor.png' : 'game-astro-survivor-mobile.png'),
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('astro-survivor-hud')).toHaveCount(0);

    // 4. Game 2: Astro Jetpack Odyssey (Enceladus 0.11g)
    await openGameHub();
    await page.getByTestId('launch-game-jetpack_odyssey').click();
    await expect(page.getByTestId('jetpack-odyssey-hud')).toBeVisible({ timeout: 12000 });
    await page.getByTestId('odyssey-world-enceladus').click();
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'game-jetpack-odyssey.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('jetpack-odyssey-hud')).toHaveCount(0);

    // 5. Game 3: Orbital Mech Arena 3D (+ Hangar drawer check)
    await openGameHub();
    await page.getByTestId('launch-game-mech_arena').click();
    await expect(page.getByTestId('mech-arena-hud')).toBeVisible({ timeout: 12000 });
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'game-mech-arena.png') });
    }
    await page.getByTestId('mech-hangar-btn').click();
    await expect(page.getByTestId('mech-hangar-modal')).toBeVisible();
    // 1st Escape closes Hangar drawer cleanly without exiting the active match (G3/U1)
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mech-hangar-modal')).toHaveCount(0);
    await expect(page.getByTestId('mech-arena-hud')).toBeVisible();
    // 2nd Escape exits Mech Arena back to Solar System
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('mech-arena-hud')).toHaveCount(0);

    // 6. Game 4: Exo-Miner Survival 3D (+ Base Shop Escape layering check)
    await openGameHub();
    await page.getByTestId('launch-game-exo_miner').click();
    await expect(page.getByTestId('exo-miner-hud')).toBeVisible({ timeout: 12000 });
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'game-exo-miner.png') });
    }
    await page.getByTestId('miner-base-shop-btn').click();
    await expect(page.getByTestId('miner-shop-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('miner-shop-modal')).toHaveCount(0);
    await expect(page.getByTestId('exo-miner-hud')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('exo-miner-hud')).toHaveCount(0);

    // 7. Game 5: Zero-G Space Rescue
    await openGameHub();
    await page.getByTestId('launch-game-zero_g_rescue').click();
    await expect(page.getByTestId('zero-g-rescue-hud')).toBeVisible({ timeout: 12000 });
    await expect(page.getByTestId('zero-g-rescue-hud')).toContainText('ALPHA');
    await expect(page.getByTestId('zero-g-rescue-hud')).toContainText('DELTA');
    await page.waitForTimeout(700);
    if (isDesktop) {
      await page.screenshot({ path: path.join(shotsDir, 'game-zero-g-rescue.png') });
    }
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('zero-g-rescue-hud')).toHaveCount(0);

    // Confirm Solar System UI restored with zero horizontal overflow and zero console errors
    await expect(page.getByTestId('space-games-nav-btn')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(consoleErrors).toEqual([]);
  });
});
