const { spawn } = require("node:child_process");

async function pipeImagesStreamToVideo({
  imagesStream,
  videoOutputPath,
  audioTrackPath,
  framesPerSecond,
  videoHeight,
  videoWidth,
}) {
  // create child process for ffmpeg with options
  // took this from here: https://stackoverflow.com/questions/37957994/how-to-create-a-video-from-image-buffers-using-fluent-ffmpeg#37999461
  const ffmpegProcess = spawn("ffmpeg", [
    "-y",
    "-f",
    "image2pipe",
    "-s",
    `${videoWidth}x${videoHeight}`,
    "-framerate",
    framesPerSecond,
    "-i",
    "-",
    "-i",
    audioTrackPath,
    "-vcodec",
    "libx264",
    "-shortest",
    videoOutputPath,
  ]);

  ffmpegProcess.stdout.on("data", (data) => console.log(data.toString()));
  ffmpegProcess.stderr.on("data", (data) => console.log(data.toString()));
  ffmpegProcess.on("close", (code) => {
    console.log(`done writing video! (${code})`);
  });

  // the images will be piped into the ffmpeg input
  imagesStream.pipe(ffmpegProcess.stdin);
}

module.exports = {
  pipeImagesStreamToVideo,
};
