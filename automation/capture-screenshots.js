const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const extensionPath = path.resolve(__dirname, '..');
  const userDataDir = path.resolve(__dirname, 'temp-profile');
  const manifestPath = path.join(extensionPath, 'manifest.json');

  // Directories to save screenshots
  const localScreenshotsDir = path.join(extensionPath, 'screenshots');
  const artifactScreenshotsDir = 'C:\\Users\\jngth\\.gemini\\antigravity-cli\\brain\\b2396aa6-1db1-4681-935b-cd40f52df46c';

  if (!fs.existsSync(localScreenshotsDir)) {
    fs.mkdirSync(localScreenshotsDir, { recursive: true });
  }

  console.log('Reading manifest.json...');
  const manifestOriginal = fs.readFileSync(manifestPath, 'utf8');
  const manifestJson = JSON.parse(manifestOriginal);

  // Backup manifest
  fs.writeFileSync(manifestPath + '.bak', manifestOriginal, 'utf8');

  // Add background worker
  manifestJson.background = {
    service_worker: 'js/background-temp.js'
  };
  const tempBgDir = path.join(extensionPath, 'js');
  if (!fs.existsSync(tempBgDir)) {
    fs.mkdirSync(tempBgDir, { recursive: true });
  }
  const backgroundTempPath = path.join(tempBgDir, 'background-temp.js');
  fs.writeFileSync(backgroundTempPath, 'console.log("temp worker");', 'utf8');
  fs.writeFileSync(manifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');

  console.log('Launching browser with extension...');
  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        `--headless=new`
      ]
    });

    console.log('Waiting for service worker to register...');
    let background = context.serviceWorkers()[0];
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 15000 });
    }

    const extensionId = background.url().split('/')[2];
    console.log('Extension ID:', extensionId);

    const page = await context.newPage();

    // Mock PlanetTerp API course responses
    await page.route(/https:\/\/planetterp\.com\/api\/v1\/course\?name=(.*)/, async (route, request) => {
      const url = request.url();
      const courseName = url.split('name=')[1];
      let gpa = 3.0;
      if (courseName === 'CMSC100') gpa = 3.42;
      if (courseName === 'CMSC115') gpa = 3.10;
      if (courseName === 'CMSC122') gpa = 3.25;
      if (courseName === 'CMSC125') gpa = 2.95;
      if (courseName === 'CMSC131') gpa = 3.12;
      if (courseName === 'CMSC132') gpa = 3.05;
      if (courseName === 'CMSC216') gpa = 2.88;
      
      console.log(`Mocking PlanetTerp GPA response for ${courseName}: ${gpa}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ average_gpa: gpa, name: courseName })
      });
    });

    // Mock PlanetTerp API professor responses
    await page.route(/https:\/\/planetterp\.com\/api\/v1\/professor\?name=(.*)&reviews=true/, async (route, request) => {
      const url = request.url();
      const profName = decodeURIComponent(url.split('name=')[1].split('&')[0]);
      let rating = 4.0;
      let reviews = [];
      let slug = '';
      if (profName.includes('Burkhauser')) {
        rating = 4.45;
        slug = 'nora-burkhauser';
        reviews = [
          {
            course: 'CMSC131',
            rating: 5,
            expected_grade: 'A',
            created: '2026-05-10T12:00:00Z',
            review: 'Nora is wonderful! She is patient, explains the programming projects clearly, and does a lot of live coding exercises in class.'
          },
          {
            course: 'CMSC131',
            rating: 4,
            expected_grade: 'B',
            created: '2026-04-18T12:00:00Z',
            review: 'Nice teacher, tests are very reasonable if you follow class slides. Projects can be tough but there is plenty of TA help.'
          }
        ];
      } else if (profName.includes('Gonzalez')) {
        rating = 4.62;
        slug = 'elias-gonzalez';
        reviews = [
          {
            course: 'CMSC131',
            rating: 5,
            expected_grade: 'A',
            created: '2026-05-15T12:00:00Z',
            review: 'Elias is an amazing instructor. He really cares about student success and makes lectures fun and easy to understand. Best 131 professor!'
          },
          {
            course: 'CMSC131',
            rating: 4,
            expected_grade: 'B',
            created: '2026-04-20T12:00:00Z',
            review: 'Great professor, very energetic. Projects are standard but his explanations make them less daunting.'
          }
        ];
      } else if (profName.includes('Sadeghian')) {
        rating = 4.58;
        slug = 'pedram-sadeghian';
        reviews = [
          {
            course: 'CMSC132',
            rating: 5,
            expected_grade: 'A',
            created: '2026-05-11T12:00:00Z',
            review: 'Pedram is fantastic. His explanations of data structures are very clear, and he gives great advice for projects.'
          }
        ];
      } else if (profName.includes('Yoon')) {
        rating = 4.12;
        slug = 'ilchul-yoon';
        reviews = [
          {
            course: 'CMSC132',
            rating: 4,
            expected_grade: 'B',
            created: '2026-05-02T12:00:00Z',
            review: 'Good professor, very structured lectures. Make sure to start the projects early as they require a lot of coding.'
          }
        ];
      }
      console.log(`Mocking PlanetTerp professor response for ${profName}: Rating=${rating}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ name: profName, average_rating: rating, slug, reviews })
      });
    });

    console.log('Navigating to real UMD SOC page...');
    await page.goto('https://app.testudo.umd.edu/soc/202601/CMSC');

    console.log('Waiting for course catalog to load...');
    await page.waitForSelector('.course', { timeout: 15000 });

    console.log('Toggling sections for CMSC131 and CMSC132...');
    // Click Show Sections on CMSC131
    const cmsc131 = page.locator('#CMSC131');
    await cmsc131.locator('a.toggle-sections-link').click();

    // Click Show Sections on CMSC132
    const cmsc132 = page.locator('#CMSC132');
    await cmsc132.locator('a.toggle-sections-link').click();

    console.log('Waiting for extension elements to load and populate...');
    // The content script runs and retrieves data. Let's wait for tags to appear in sections-container.
    await page.waitForSelector('#CMSC131 .sections-container .terp-rater-tag', { timeout: 15000 });
    await page.waitForTimeout(1000); // Animation buffer

    // Scroll to CMSC131 so it's fully visible and centered in the screenshot
    const elementHandle = await page.$('#CMSC131');
    if (elementHandle) {
      await elementHandle.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -180));
    }
    await page.waitForTimeout(500);

    // Save Screenshot 1: Main View
    console.log('Capturing Screenshot 1: Main View...');
    const path1 = path.join(localScreenshotsDir, 'screenshot-1-main.png');
    const artPath1 = path.join(artifactScreenshotsDir, 'screenshot-1-main.png');
    await page.screenshot({ path: path1 });
    fs.copyFileSync(path1, artPath1);
    console.log(`Captured Screenshot 1 saved to: ${path1}`);

    // Save Screenshot 2: Tooltip Hover View
    console.log('Capturing Screenshot 2: Tooltip Hover View...');
    // We hover over the average GPA tag of CMSC131 to show its tooltip
    const gpaTag = page.locator('#CMSC131 .terp-rater-tag-container span').first();
    await gpaTag.hover();
    // Wait for tooltip animation to finish
    await page.waitForTimeout(500);

    const path2 = path.join(localScreenshotsDir, 'screenshot-2-tooltip.png');
    const artPath2 = path.join(artifactScreenshotsDir, 'screenshot-2-tooltip.png');
    await page.screenshot({ path: path2 });
    fs.copyFileSync(path2, artPath2);
    console.log(`Captured Screenshot 2 saved to: ${path2}`);

    // Move hover away to hide the tooltip before opening the modal
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    // Save Screenshot 3: Professor Review Modal
    console.log('Capturing Screenshot 3: Reviews Modal...');
    // Elias Gonzalez's rating tag is in CMSC131, section 0101
    const eliasRatingTag = page.locator('#CMSC131 .section-info-container:has-text("Elias Gonzalez") .terp-rater-tag.rating').first();
    await eliasRatingTag.click();
    
    // Wait for the modal dialog to be visible
    await page.waitForSelector('dialog.terp-rater-dialog[open]', { timeout: 10000 });
    await page.waitForTimeout(500); // Animation buffer

    const path3 = path.join(localScreenshotsDir, 'screenshot-3-modal.png');
    const artPath3 = path.join(artifactScreenshotsDir, 'screenshot-3-modal.png');
    await page.screenshot({ path: path3 });
    fs.copyFileSync(path3, artPath3);
    console.log(`Captured Screenshot 3 saved to: ${path3}`);

    // Close the modal
    await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      if (dialog) dialog.close();
    });
    await page.waitForSelector('dialog.terp-rater-dialog[open]', { state: 'hidden', timeout: 5000 });

    // Bookmark some sections to populate the bookmarks popup
    console.log('Bookmarking some sections...');
    // Click Elias's bookmark button in CMSC131
    const b1 = page.locator('#CMSC131 .section-info-container:has-text("Elias Gonzalez") .tr-bookmark-btn').first();
    await b1.click();
    await page.waitForTimeout(200);

    // Click Pedram's bookmark button in CMSC132
    const b2 = page.locator('#CMSC132 .section-info-container:has-text("Pedram Sadeghian") .tr-bookmark-btn').first();
    await b2.click();
    await page.waitForTimeout(500);

    // Save Screenshot 4: Bookmarks Popup View (styled beautifully with presentation background)
    console.log('Capturing Screenshot 4: Popup View...');
    const popupUrl = `chrome-extension://${extensionId}/html/popup.html`;
    
    const popupPage = await context.newPage();
    await popupPage.goto(popupUrl);
    await popupPage.waitForSelector('#bookmark-list');
    await popupPage.waitForTimeout(500);

    // Wrap the popup in a beautiful mockup presentation canvas inside the browser tab
    await popupPage.evaluate(() => {
      const body = document.body;
      body.style.width = '100vw';
      body.style.height = '100vh';
      body.style.margin = '0';
      body.style.padding = '0';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.justifyContent = 'center';
      body.style.alignItems = 'center';
      body.style.background = 'radial-gradient(circle at center, #1e293b, #0f172a)';
      body.style.overflow = 'hidden';

      const originalContainer = document.createElement('div');
      originalContainer.style.width = '360px';
      originalContainer.style.background = '#F0F2F5';
      originalContainer.style.borderRadius = '16px';
      originalContainer.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
      originalContainer.style.overflow = 'hidden';
      originalContainer.style.border = '1px solid rgba(255,255,255,0.08)';

      while (body.firstChild) {
        originalContainer.appendChild(body.firstChild);
      }

      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '20px';

      const titleBlock = document.createElement('div');
      titleBlock.style.textAlign = 'center';
      titleBlock.style.fontFamily = '"Work Sans", sans-serif';
      titleBlock.style.color = '#ffffff';
      
      const badge = document.createElement('div');
      badge.textContent = 'TERP RATER FEATURE';
      badge.style.background = '#e21833';
      badge.style.color = '#ffffff';
      badge.style.fontWeight = 'bold';
      badge.style.fontSize = '10px';
      badge.style.padding = '4px 10px';
      badge.style.borderRadius = '20px';
      badge.style.display = 'inline-block';
      badge.style.marginBottom = '10px';
      badge.style.letterSpacing = '1px';

      const title = document.createElement('h1');
      title.textContent = 'Section Bookmarks';
      title.style.fontSize = '28px';
      title.style.fontWeight = '800';
      title.style.margin = '0';
      title.style.letterSpacing = '0.5px';

      const desc = document.createElement('p');
      desc.textContent = 'Keep track of your favorite course sections in one place and view seat availability instantly';
      desc.style.fontSize = '13.5px';
      desc.style.color = '#94a3b8';
      desc.style.margin = '5px 0 0 0';
      desc.style.maxWidth = '400px';
      desc.style.lineHeight = '1.4';

      titleBlock.appendChild(badge);
      titleBlock.appendChild(title);
      titleBlock.appendChild(desc);

      wrapper.appendChild(titleBlock);
      wrapper.appendChild(originalContainer);
      body.appendChild(wrapper);
    });
    
    await popupPage.waitForTimeout(500);

    const path4 = path.join(localScreenshotsDir, 'screenshot-4-popup.png');
    const artPath4 = path.join(artifactScreenshotsDir, 'screenshot-4-popup.png');
    await popupPage.screenshot({ path: path4 });
    fs.copyFileSync(path4, artPath4);
    console.log(`Captured Screenshot 4 saved to: ${path4}`);

    console.log('All screenshots captured successfully!');

  } catch (e) {
    console.error('An error occurred during capture:', e);
  } finally {
    if (context) {
      await context.close();
    }
    // Restore manifest
    fs.writeFileSync(manifestPath, manifestOriginal, 'utf8');
    try { fs.unlinkSync(manifestPath + '.bak'); } catch(e) {}
    try { fs.unlinkSync(backgroundTempPath); } catch(e) {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch(e) {}
  }
})();
