import Handlebars from 'handlebars';
import felidImage from './src/helpers/felid-image.js';
import randomFelids from './src/helpers/random-felids.js';
import { readFileSync } from 'fs';

export default function(eleventyConfig) {
  // Register Handlebars helpers
  eleventyConfig.addHandlebarsHelper('felidImage', felidImage);
  eleventyConfig.addHandlebarsHelper('randomFelids', randomFelids);

  // Add global data from public/data
  eleventyConfig.addGlobalData('felids', JSON.parse(
    readFileSync('./public/data/felids-base.json', 'utf-8')
  ));

  // Copy assets to output
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("public");

  // Copy public assets to root of dist
  eleventyConfig.addPassthroughCopy({ "public/assets": "assets" });

  // Set input/output directories
  return {
    dir: {
      input: "src/pages",
      output: "dist",
      includes: "_partials"
    },
    templateFormats: ["hbs", "html", "md"],
    htmlTemplateEngine: "hbs",
    markdownTemplateEngine: "hbs"
  };
}
