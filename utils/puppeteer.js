// for rendering HTML and taking screenshots
const puppeteer = require("puppeteer");
const fs = require("fs");
const nodeStaticServer = require("node-static");
const http = require("http");
const { getAudioDurationInSeconds } = require("get-audio-duration");

async function writeScreenshotsToStream({
  outputDir,
  serverPort,
  pageUrl,
  audioTrackPath,
  framesPerSecond,
  videoHeight,
  videoWidth,
  imagesStream,
}) {
  // create a static web server, so puppeteer can view the website
  const fileServer = new nodeStaticServer.Server(outputDir);

  const eleventyServer = http.createServer(function (request, response) {
    request
      .addListener("end", function () {
        fileServer.serve(request, response);
      })
      .resume();
  });

  eleventyServer.listen(serverPort);

  const AUDIO_DURATION = await getAudioDurationInSeconds(audioTrackPath);

  const TOTAL_NUM_FRAMES = Number(
    (AUDIO_DURATION * framesPerSecond).toFixed(0)
  );

  let currentFrame = 0;

  // boot up the puppeteer browser

  const browser = await puppeteer.launch();
  const browserPage = await browser.newPage();

  await browserPage.setViewport({
    width: videoWidth,
    height: videoHeight,
  });

  await browserPage.goto(`http://localhost:${serverPort}${pageUrl}#0`);

  // for each frame in the video
  while (currentFrame < TOTAL_NUM_FRAMES) {
    // for each frame, navigate to the hash

    // the 'hashchange' event will fire on the client side, adjusting the view
    // see assets/frame-control.js for more details

    await browserPage.goto(
      `http://localhost:${serverPort}${pageUrl}#${currentFrame}`
    );

    const pngBuffer = await browserPage.screenshot({
      type: "jpeg",
      quality: 100,
    });

    // write the image to the stream, which will be included in the video
    imagesStream.write(pngBuffer, "utf-8");

    currentFrame++;
  }

  // when we are done, shut down the browser, the static server and close the image stream
  browser.close();
  eleventyServer.close();
  imagesStream.end();
}

module.exports = {
  writeScreenshotsToStream,
};
