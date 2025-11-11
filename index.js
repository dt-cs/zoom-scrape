const { firefox } = require('playwright-core');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * HTTP Cloud Function.
 * Expects JSON body with: { "zoomUrl": "<YOUR_ZOOM_RECORDING_URL>" }
 */
exports.scrapeZoomTranscript = async (req, res) => {
  const zoomUrl = req.body?.zoomUrl;

  if (!zoomUrl) {
    res.status(400).send({ error: 'Missing zoomUrl in request body' });
    return;
  }

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Opening Zoom recording URL...');
    await page.goto(zoomUrl, { waitUntil: 'domcontentloaded', timeout: 0 });

    // Small delay for Zoom SPA rendering
    await delay(8000);

    // Accept cookies if present
    const cookiesBtn = await page.$('#onetrust-accept-btn-handler');
    if (cookiesBtn) {
      console.log('Clicking cookies accept button...');
      await cookiesBtn.click();
      await delay(2000);
    }

    // Scroll transcript container to render all items
    const scrollContainer = '#transcript-tab .transcript-container .zm-scrollbar__wrap';
    const transcriptSelector = 'li.transcript-list-item';

    await page.waitForSelector(scrollContainer, { timeout: 20000 });

    let previousHeight = 0;
    let scrollAttempts = 0;

    while (scrollAttempts < 30) {
      const currentHeight = await page.evaluate(selector => {
        const container = document.querySelector(selector);
        return container ? container.scrollHeight : 0;
      }, scrollContainer);

      if (currentHeight === previousHeight) break;

      await page.evaluate(selector => {
        const container = document.querySelector(selector);
        if (container) container.scrollBy(0, 1000);
      }, scrollContainer);

      previousHeight = currentHeight;
      scrollAttempts++;
      await delay(500);
    }

    console.log('Extracting transcript items...');
    const transcriptData = await page.$$eval(transcriptSelector, items =>
      items.map(li => li.getAttribute('aria-label'))
    );

    console.log(`Extracted ${transcriptData.length} transcript items`);

    res.status(200).send({ transcript: transcriptData });
  } catch (err) {
    console.error('Error scraping Zoom transcript:', err);
    res.status(500).send({ error: err.message });
  } finally {
    await browser.close();
  }
};
