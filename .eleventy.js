require("dotenv").config();
const { convertHtmlToSpeech } = require("./utils/azure-tts.js");
const { takeScreenshots } = require("./utils/puppeteer.js");

const fs = require("fs");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");

  eleventyConfig.addFilter("convertHtmlToSpeech", async (htmlContent) => {
    const { audioBuffer, bookmarks, annotatedHtml } = await convertHtmlToSpeech(
      htmlContent,
      {
        voiceName: "en-AU-WilliamNeural",
        resourceKey: process.env.AZURE_SPEECH_RESOURCE_KEY,
        region: process.env.AZURE_SPEECH_REGION,
        speed: "0%",
        lexiconUrl: null,
        includeSelector: "h1,h2,h3,h4,p,li",
      }
    );

    await fs.promises.writeFile("./audio-track.mp3", audioBuffer);
    await fs.promises.writeFile(
      "./bookmarks.json",
      JSON.stringify(bookmarks, null, 2)
    );

    return {
      annotatedHtml,
      bookmarks,
    };
  });

  // remove the temporary directory after running
  eleventyConfig.on("eleventy.after", async function () {
    const tmpDirExists = fs.existsSync(".tmp-text-to-speech");
    if (tmpDirExists) {
      await fs.promises.rm(".tmp-text-to-speech", { recursive: true });
    }
  });

  eleventyConfig.on("eleventy.after", function () {
    takeScreenshots({
      outputDir: "11ty-output",
      pageUrl: "/",
      serverPort: 5050,
      audioTrackPath: "./audio-track.mp3",
      framesPerSecond: 30,
      videoHeight: 720,
      videoWidth: 1280,
    });
  });

  return {
    dir: {
      input: "11ty-input",
      output: "11ty-output",
    },
  };
};
