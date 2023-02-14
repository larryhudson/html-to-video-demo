const {
  SpeechConfig,
  SpeechSynthesisOutputFormat,
  AudioConfig,
  SpeechSynthesizer,
} = require("microsoft-cognitiveservices-speech-sdk");

const { AssetCache } = require("@11ty/eleventy-fetch");
const md5 = require("js-md5");
const { join } = require("path");
const { encode } = require("html-entities");
const fs = require("fs");
const cheerio = require("cheerio");

async function convertSsmlToSpeech(ssml, options) {
  // Check cache for generated audio based on unique hash of SSML content
  const textHash = md5(ssml);

  let cachedAudio = new AssetCache(`audio_${textHash}`);
  let cachedBookmarks = new AssetCache(`bookmarks_${textHash}`);

  if (cachedAudio.isCacheValid("365d")) {
    console.log(`[text-to-speech] Using cached MP3 data for hash ${textHash}`);

    const audio = await cachedAudio.getCachedValue();
    const bookmarks = await cachedBookmarks.getCachedValue();

    return {
      audio,
      bookmarks,
    };
  } else {
    console.log(
      `[text-to-speech] Asking Microsoft API to generate MP3 for hash ${textHash}`
    );
  }

  // Setup Azure Text to Speech API

  if (!options.resourceKey)
    throw new Error(
      `[text-to-speech] resourceKey is not set in the text to speech options.\n Either add the environment variable AZURE_SPEECH_RESOURCE_KEY or set 'resourceKey' in the 'textToSpeech' options when adding the plugin`
    );

  if (!options.region)
    throw new Error(
      `[text-to-speech] region is not set in the text to speech options.\n Either add the environment variable AZURE_SPEECH_REGION or set 'region' in the 'textToSpeech' options when adding the plugin`
    );

  const speechConfig = SpeechConfig.fromSubscription(
    options.resourceKey,
    options.region
  );

  speechConfig.speechSynthesisLanguage = options.voiceName.slice(0, 5);
  speechConfig.speechSynthesisVoiceName = options.voiceName;
  speechConfig.speechSynthesisOutputFormat =
    SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const TMP_FOLDER_NAME = `.tmp-text-to-speech`;

  //   TODO: write hook to delete the temp folder after build
  if (!fs.existsSync(TMP_FOLDER_NAME)) {
    fs.mkdirSync(TMP_FOLDER_NAME);
  }

  const tmpFilePath = join(TMP_FOLDER_NAME, `${textHash}.mp3`);

  const audioConfig = AudioConfig.fromAudioFileOutput(tmpFilePath);

  const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

  const bookmarks = [];

  synthesizer.bookmarkReached = (_, event) => {
    const startTime = event.audioOffset * 0.0000001;
    const startTimeRounded = parseFloat(startTime.toFixed(5));
    bookmarks.push({
      startTime: startTimeRounded,
      id: event.text.trim(),
    });
  };

  // Generate MP3 with Azure API

  const audioArrayBuffer = await new Promise((resolve, reject) => {
    const ssmlText = `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="${options.voiceName.slice(
      0,
      5
    )}">
          <voice name="${options.voiceName}">
          ${options.lexiconUrl ? `<lexicon uri="${options.lexiconUrl}" />` : ""}
          <prosody rate="${options.speed}" pitch="0%">
          ${ssml}
          </prosody>
          </voice>
          </speak>`;

    synthesizer.speakSsmlAsync(
      ssmlText,
      async (result) => {
        synthesizer.close();
        if (result) {
          resolve(result.privAudioData);
        } else {
          reject(result);
        }
      },
      (error) => {
        console.log(`[text-to-speech] Error while generating MP3`);
        synthesizer.close();
        throw new Error(error);
      }
    );
  });

  const audio = Buffer.from(audioArrayBuffer);

  await cachedAudio.save(audio, "buffer");
  await cachedBookmarks.save(bookmarks, "json");

  return {
    audio,
    bookmarks,
  };
}

function convertHtmlToSsml(htmlContent, selector) {
  const $ = cheerio.load(htmlContent);

  const elementsToInclude = $(selector);

  const ssmlTags = [];

  $(elementsToInclude).each((index, elem) => {
    const bookmarkId = `bookmark-${index}`;
    $(elem).attr("data-bookmark-id", bookmarkId);
    const textContent = $(elem).text();

    ssmlTags.push(`<bookmark mark="${bookmarkId}" />${encode(textContent)}`);
  });

  return {
    ssml: ssmlTags.join("\n"),
    annotatedHtml: $.html(),
  };
}

async function convertHtmlToSpeech(htmlContent, options) {
  const { ssml, annotatedHtml } = convertHtmlToSsml(
    htmlContent,
    options.includeSelector
  );

  await fs.promises.writeFile("./ssml.html", ssml);

  // TODO: actually break it into chunks
  const chunks = [ssml];

  const audioAndTimings = await Promise.all(
    chunks.map((chunk) => convertSsmlToSpeech(chunk, options))
  );

  const audioBuffers = audioAndTimings.map(
    (audioAndTiming) => audioAndTiming.audio
  );
  const bookmarksArrays = audioAndTimings.map(
    (audioAndTiming) => audioAndTiming.bookmarks
  );

  return {
    audioBuffer: Buffer.concat(audioBuffers),
    bookmarks: bookmarksArrays.flat(),
    annotatedHtml,
  };
}

module.exports = {
  convertHtmlToSpeech,
};
