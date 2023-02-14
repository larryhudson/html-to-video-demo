# Turning HTML into a video with Eleventy, Azure TTS, Puppeteer and ffmpeg

This is a demo showing how you can create a video using HTML content. This demo uses:

- Eleventy
- Azure TTS
- Puppeteer
- ffmpeg
- cheerio.

Documentation is a work in progress, but here are some quick notes about how it works:

- you edit the content of the video inside `11ty-input`, and the CSS styling inside `assets/style.css`
- once you've created an Azure TTS API key, you can copy `.env.sample` and copy and paste in your region and your API key
- when you run `npm run build` or `npm run start`, your HTML content will be converted into audio (using the `convertHtmlToSpeech` filter defined in `.eleventy.js`). It will save an `audio-track.mp3` file, and save JSON of the timing data, so it can be synced up with the audio. See `utils/azure-tts.js` for more info
- after the Eleventy build is complete, it will render a video by taking screenshots with Puppeteer. Puppeteer will navigate to the webpage, and then go to a # hash location for each frame (eg. #1, #2, #3) and take a screenshot of each frame. See `utils/puppeteer.js` for more info on how Puppeteer works, and `assets/frame-control.js` for how the webpage renders each frame.
- the screenshots are piped into ffmpeg, which renders the video. See `utils/ffmpeg.js` for more info.

You can see a [demo video here](demo-video.mp4).
