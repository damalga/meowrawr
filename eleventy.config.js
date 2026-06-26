import handlebarsPlugin from '@11ty/eleventy-plugin-handlebars';
import Handlebars from 'handlebars';
import felidImage from './src/helpers/felid-image.js';
import getFelids from './public/data/felids.js';

export default async function(eleventyConfig) {
  // Register Handlebars helpers BEFORE adding the plugin
  Handlebars.registerHelper('felidImage', felidImage);

  // Add Handlebars plugin
  eleventyConfig.addPlugin(handlebarsPlugin);

  eleventyConfig.addGlobalData('felids', await getFelids());

  // Copy assets to output
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("public");

  // Copy public assets to root of dist
  eleventyConfig.addPassthroughCopy({ "public/assets": "assets" });

  // Copy glider-js from node_modules
  eleventyConfig.addPassthroughCopy({ "node_modules/glider-js/glider.min.js": "assets/libs/glider/glider.min.js" });
  eleventyConfig.addPassthroughCopy({ "node_modules/glider-js/glider.min.css": "assets/libs/glider/glider.min.css" });

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
