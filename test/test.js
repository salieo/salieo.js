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
  
  await chromePage.goto(pageURL, {waitUntil: 'load', timeout:100000});
  await chromePage.screenshot({path: tmpImgPath, fullPage: true});

  
  var testRAW = fs.readFileSync(tmpImgPath);
  var testPNG = PNG.sync.read(testRAW);
  var expectedRAW = fs.readFileSync(expectedImgPath);
  var expectedPNG = PNG.sync.read(expectedRAW);

  var diff = pixelmatch(testPNG.data, expectedPNG.data, null, testPNG.width, testPNG.height, {threshold: 0.05});

  fs.unlinkSync(tmpImgPath); //Delete the temporary test image

  return diff / (expectedPNG.width * expectedPNG.height);
}

function screenshotTest(name, test, chromePage) {
  test.test(name, async (test) => {
    try {
      var testDiff = await verifyScreenshot(name, chromePage);
      if(testDiff < verifyThreshold) {
        test.pass("Test screenshot matches expected.");
      } else {
        test.fail("Test screenshot does not match! Difference: " + (testDiff * 100).toFixed(1) + "%");
      }
    } catch (error) {
      test.fail(error);
    }
    test.end();
  }, {timeout: 110000});
}

(async () => {
  //Set up puppeteer
  const browser = await puppeteer.launch();
  const chromePage = await browser.newPage();
  await chromePage.setViewport({width: 1920, height: 1080});

  screenshotTest("background_img", test, chromePage);
  screenshotTest("img_tag", test, chromePage);
  screenshotTest("avoid_text", test, chromePage);
  screenshotTest("combined", test, chromePage);

  test.onFinish(async () => {
    await browser.close();
  });
})();