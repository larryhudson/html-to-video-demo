// for rendering HTML and taking screenshots
const puppeteer = require("puppeteer");
const fs = require("fs");
const nodeStaticServer = require("node-static");
const http = require("http");
const { getAudioDurationInSeconds } = require("get-audio-duration");

async function takeScreenshots({
  outputDir,
  serverPort,
  pageUrl,
  audioTrackPath,
  framesPerSecond,
  videoHeight,
  videoWidth,
}) {
  const fileServer = new nodeStaticServer.Server(outputDir);

  const eleventyServer = http.createServer(function (request, response) {
    request
      .addListener("end", function () {
        fileServer.serve(request, response);
      })
      .resume();
  });

  const TMP_DIR_PATH = "./frames";

  const tmpDirExists = fs.existsSync(TMP_DIR_PATH);

  if (!tmpDirExists) {
    await fs.promises.mkdir(TMP_DIR_PATH);
  }

  eleventyServer.listen(serverPort);

  const AUDIO_DURATION = await getAudioDurationInSeconds(audioTrackPath);

  const TOTAL_NUM_FRAMES = Number(
    (AUDIO_DURATION * framesPerSecond).toFixed(0)
  );
  console.log("Video duration: ", AUDIO_DURATION);

  let currentFrame = 0;

  const browser = await puppeteer.launch();
  const browserPage = await browser.newPage();
  await browserPage.setViewport({
    width: videoWidth,
    height: videoHeight,
  });

  await browserPage.goto(`http://localhost:${serverPort}${pageUrl}#0`);

  // for each frame in the video
  while (currentFrame < TOTAL_NUM_FRAMES) {
    // for each frame, adjust the HTML to add the highlight to the current word

    await browserPage.goto(
      `http://localhost:${serverPort}${pageUrl}#${currentFrame}`
    );

    const pngBuffer = await browserPage.screenshot({
      type: "jpeg",
      quality: 100,
    });

    console.log(`saving screenshot ${currentFrame} of ${TOTAL_NUM_FRAMES}`);

    await fs.promises.writeFile(
      `${TMP_DIR_PATH}/frame-${currentFrame}.jpg`,
      pngBuffer
    );

    currentFrame++;
  }

  browser.close();
  eleventyServer.close();
}

module.exports = {
  takeScreenshots,
};
