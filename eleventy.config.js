import handlebarsPlugin from '@11ty/eleventy-plugin-handlebars';
import Handlebars from 'handlebars';
import felidImage from './src/helpers/felid-image.js';
import getFelids from './public/data/felids.js';

const site = {
  name: 'Meowrawr',
  tagline: 'Enciclopedia Felina',
  description: 'Enciclopedia divulgativa sobre las 41 especies de felinos: taxonomía, descripción, fotos y fuentes.',
  url: 'https://meowrawr.org',
  language: 'es',
  locale: 'es_ES',
  logo: 'https://meowrawr.org/assets/logo/logo-1.webp',
  author: {
    name: 'Damalga',
    email: 'damalga@protonmail.com',
    url: 'https://damalga.com'
  }
};

function stripHtml(input) {
  return String(input || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(input, length) {
  const str = String(input || '');
  const n = Number(length) || 160;
  if (str.length <= n) return str;
  const cut = str.slice(0, n - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function absoluteUrl(path) {
  if (!path) return site.url;
  if (/^https?:\/\//i.test(path)) return path;
  return site.url.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}

export default async function(eleventyConfig) {
  Handlebars.registerHelper('felidImage', felidImage);
  Handlebars.registerHelper('stripHtml', stripHtml);
  Handlebars.registerHelper('truncate', (str, n) => truncate(str, n));
  Handlebars.registerHelper('absoluteUrl', absoluteUrl);
  Handlebars.registerHelper('json', v => new Handlebars.SafeString(JSON.stringify(v)));
  Handlebars.registerHelper('metaDescription', str => truncate(stripHtml(str), 160));
  Handlebars.registerHelper('formatDate', (d, fmt) => {
    const date = d ? new Date(d) : new Date();
    if (fmt === 'iso-date') return date.toISOString().slice(0, 10);
    return date.toISOString();
  });

  eleventyConfig.addPlugin(handlebarsPlugin);

  eleventyConfig.addGlobalData('felids', await getFelids());
  eleventyConfig.addGlobalData('site', site);
  eleventyConfig.addGlobalData('buildDate', new Date().toISOString());

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy({ "public/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "node_modules/glider-js/glider.min.js": "assets/libs/glider/glider.min.js" });
  eleventyConfig.addPassthroughCopy({ "node_modules/glider-js/glider.min.css": "assets/libs/glider/glider.min.css" });

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
