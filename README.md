# About Meowrawr

## Project

This is a feline wiki. Why? Because I’m fascinated by these animals. But who exactly is fascinated by them? Damalga, the developer behind this site, someone who would absolutely love to grab his camera and spend an entire day in the same spot, waiting for the chance to photograph and/or film an Iberian lynx in its natural habitat, out on the trail looking for rabbits... mice, partridges and/or snakes...

But Meowrawr isn’t just another feline website. It’s a project with a parallel goal that carries just as much weight as the content itself: learning how to self-host a website without relying on infrastructure providers, taking control of several layers along the way, from the hardware all the way to the point where the site becomes accessible from any web browser. That means setting up the web server and dealing with a whole bunch of issues related to internet security.

## Hardware

The server is a Raspberry Pi 4 with 8 GB of RAM. Why not the more powerful Pi 5? Power consumption and heat.

This machine is going to be running 24/7, so I prioritised efficiency over raw performance. To serve static HTML, I don’t need a cheetah (an insane 110 km/h sprint, but only for a few seconds before overheating). I need a quiet, cool little machine that won’t send my electricity bill through the roof.

I put it inside a DeskPi Pro V3 case from 52Pi, which I “acquired” through Hackeed. I also added an SSD I had lying around from an old laptop...

And well, I won’t go into much more detail about the hardware here. If you’re curious about the full homelab, I’ll invite you to explore every corner of the system at some point.

## Software

The Pi runs Debian (Trixie) without a desktop environment. On top of that base system, I’m building the site’s stack.

Nginx acts as the web server, with TLS certificates managed by Cloudflare. The tunnel encrypts the connection all the way to the Pi, so Nginx can serve the site over plain HTTP behind it.

The site itself is statically generated with 11ty, using Handlebars as the templating engine so I don’t have to manage every single feline entry independently.

But beyond the infrastructure, Meowrawr is also an excuse to learn how to deal with large-scale APIs. The information for each entry comes from Wikidata (to retrieve the identifiers for each species), Wikipedia (for the actual information), and the images come from iNaturalist.

A good part of the work therefore involves querying, cross-referencing and normalising what these sources return, and turning it into something presentable... No small feat.

Right now, I’m also preparing for the LPIC-1 (Linux Professional Institute Certification), a well-known certification for GNU/Linux system administrators. So I’m using every decision I make on Meowrawr as an excuse to dig deeper into permissions, processes, networking and Bash scripting.

As a proper Linux nerd, my goal is to have the Pi handle some repetitive tasks when deploying updates, as well as building a monitoring system that can notify me if something goes wrong.

## Summary

Meowrawr is the project I’m using to consolidate some system administration skills without losing sight of my frontend developer background, which is what I’ve been doing professionally for the past few years.

All of this while sharing my passion for felines.

And if, a few years from now, I can afford to go out and photograph or film these creatures in the wild under the excuse that I run this website... well, I’d say we’ve made it!

## Your own wiki?

Meowrawr is about felines, but the engine underneath doesn't care. It's a small pipeline that reads a seed JSON file, hits a few public APIs at build time, caches everything on disk for a week, and spits out static HTML. Swap the seed and the enrichment steps and you have a wiki about whatever you love: mushrooms, board games, vintage synths, your favourite basketball team's players, sneakers, ramen shops in your city, obscure indie games, extinct languages, whatever.

The recipe is always the same:

1. A tiny seed file with the identifiers you care about.
2. One or more enrichment steps that hit an API, fail soft, and cache the response.
3. A Handlebars template that renders one page per record via Eleventy pagination.
4. A Raspberry Pi (or any cheap box) behind a Cloudflare Tunnel or Nginx Reverse Proxy. Or simply use Vercel or Netlify and you're online.

You don't need a database, a CMS, a framework, or a hosting bill. You need curiosity about something, a weekend, and the patience to read a couple of API docs.

Fork this repo, rip out the felids, and go build the wiki nobody asked for but the internet secretly needs. If you do, drop me a link! I'll be the first visitor.
