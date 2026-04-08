import handlebarsPlugin from '@11ty/eleventy-plugin-handlebars';
import Handlebars from 'handlebars';
import felidImage from './src/helpers/felid-image.js';
import randomFelids from './src/helpers/random-felids.js';
import getFelidData from './public/data/felids-wikidata.js';

export default async function(eleventyConfig) {
  // Register Handlebars helpers BEFORE adding the plugin
  Handlebars.registerHelper('felidImage', felidImage);
  Handlebars.registerHelper('randomFelids', randomFelids);

  // Add Handlebars plugin
  eleventyConfig.addPlugin(handlebarsPlugin);

  // Add global data from Wikidata (fetches images at build time)
  const felidsData = await getFelidData();
  eleventyConfig.addGlobalData('felids', felidsData);

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
