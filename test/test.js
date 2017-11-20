const fs = require("fs"),
  path = require("path"),
  PNG = require('pngjs').PNG,
  pixelmatch = require('pixelmatch'),
  puppeteer = require('puppeteer'),
  test = require('tape');

const pixelMatchThreshold = 0.05,
  verifyThreshold = 0.05,
  expectedImgDir = "./expected_img",
  testPagesDir = "./test_pages";

async function verifyScreenshot(testName, chromePage) {
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
  const chromePage = await browser.newPage();
  await chromePage.setViewport({width: 1920, height: 1080});

  test.test("background_img", async (test) => {
    test.ok(await verifyScreenshot("background_img", chromePage).catch(error => test.fail(error)), "Check screenshot against expected.");
    test.end();
  }, {timeout: 30000});
  test.test("img_tag", async (test) => {
    test.ok(await verifyScreenshot("img_tag", chromePage).catch(error => test.fail(error)), "Check screenshot against expected.");
    test.end();
  }, {timeout: 30000});
  test.test("avoid_text", async (test) => {
    test.ok(await verifyScreenshot("avoid_text", chromePage).catch(error => test.fail(error)), "Check screenshot against expected.");
    test.end();
  }, {timeout: 30000});
  test.test("combined", async (test) => {
    test.ok(await verifyScreenshot("combined", chromePage).catch(error => test.fail(error)), "Check screenshot against expected.");
    test.end();
  }, {timeout: 30000});

  test.onFinish(async () => {
    await browser.close();
  });
})();