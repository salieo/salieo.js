const fs = require("fs"),
  path = require("path"),
  PNG = require('pngjs').PNG,
  pixelmatch = require('pixelmatch'),
  puppeteer = require('puppeteer'),
  tap = require('tap');

const numTests = 4;

tap.jobs = numTests; //Run tests in parallel
tap.plan(numTests);

const pixelMatchThreshold = 0.05,
  verifyThreshold = 0.05,
  expectedImgDir = "./expected_img",
  testPagesDir = "./test_pages";

async function verifyScreenshot(testName, browser) {
  const chromePage = await browser.newPage();
  await chromePage.setViewport({width: 1920, height: 1080});

  const pageURL = 'file://' + path.join(__dirname, testPagesDir, testName + ".html"),
    expectedImgPath = path.join(__dirname, expectedImgDir, testName + ".png"),
    tmpImgPath = path.join(__dirname, 'tmp_' + testName + '_result.png');
  
  await chromePage.goto(pageURL, {waitUntil: 'load'});
  await chromePage.screenshot({path: tmpImgPath, fullPage: true});

  
  var testRAW = fs.readFileSync(tmpImgPath);
  var testPNG = PNG.sync.read(testRAW);
  var expectedRAW = fs.readFileSync(expectedImgPath);
  var expectedPNG = PNG.sync.read(expectedRAW);

  var diff = pixelmatch(testPNG.data, expectedPNG.data, null, testPNG.width, testPNG.height, {threshold: 0.05});

  fs.unlinkSync(tmpImgPath); //Delete the temporary test image

  return diff / (expectedPNG.width * expectedPNG.height) < verifyThreshold;
}

(async () => {
  //Set up puppeteer
  const browser = await puppeteer.launch();

  tap.test("background_img", async (tap) => {
    if(!await verifyScreenshot("background_img", browser)) tap.fail();
    tap.end();
  });
  tap.test("img_tag", async (tap) => {
    if(!await verifyScreenshot("img_tag", browser)) tap.fail();
    tap.end();
  });
  tap.test("avoid_text", async (tap) => {
    if(!await verifyScreenshot("avoid_text", browser)) tap.fail();
    tap.end();
  });
  tap.test("combined", async (tap) => {
    if(!await verifyScreenshot("combined", browser)) tap.fail();
    tap.end();
  });

  tap.tearDown(async () => {
    await browser.close();
  });
})();