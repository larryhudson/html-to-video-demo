module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: {
      input: "11ty-input",
      output: "11ty-output",
    },
  };
};
