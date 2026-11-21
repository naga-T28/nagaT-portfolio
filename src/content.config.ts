import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * The rules for the Markdown files in src/content/. A missing or misspelled item stops the build with
 * a message naming the file, so a broken page can't be published by accident.
 */
const projects = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      overview: z.string(),
      format: z.string(),
      team: z.string(),
      status: z.string(),
      period: z.string(),
      stack: z.array(z.string()),
      links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
      screenshot: z
        .object({
          src: image(),
          alt: z.string(),
          orientation: z.enum(['landscape', 'portrait']).default('landscape'),
        })
        .optional(),
      art: z.enum(['route', 'matrix', 'scan', 'wave', 'panes', 'shafts', 'split']),
      order: z.number(),
      featured: z.boolean().default(false),
      published: z.boolean().default(true),
    }),
});

/** Each page has one file per language in src/content/pages/ and its own required items. */
const pageFile = <Shape extends z.ZodRawShape>(file: string, shape: Shape) =>
  defineCollection({
    loader: glob({ pattern: `*/${file}.md`, base: './src/content/pages' }),
    schema: z.object(shape).strict(),
  });

const site = pageFile('site', {
  name: z.string(),
  title: z.string(),
  brandSuffix: z.string(),
  roles: z.array(z.string()),
  twitter: z.string(),
  ogImageAlt: z.string(),
  navigation: z.array(z.object({ label: z.string(), href: z.string() })),
  switchLabel: z.string(),
  switchAria: z.string(),
  ui: z.object({
    skipLink: z.string(),
    mainNav: z.string(),
    footerNav: z.string(),
    menu: z.string(),
    close: z.string(),
    newTab: z.string(),
    siteNote: z.string(),
    play: z.string(),
    pause: z.string(),
    seek: z.string(),
    volume: z.string(),
    mute: z.string(),
    unmute: z.string(),
    loop: z.string(),
    listen: z.string(),
    playError: z.string(),
  }),
});

const home = pageFile('home', {
  description: z.string(),
  aboutLine: z.string(),
  photoAlt: z.string(),
  heroWords: z.array(z.string()),
  scrollLabel: z.string(),
  musicTitle: z.string(),
  musicArtist: z.string(),
  aboutLink: z.string(),
  projectsLink: z.string(),
  researchLink: z.string(),
  contactLink: z.string(),
});

const projectsPage = pageFile('projects', {
  title: z.string(),
  description: z.string(),
  lead: z.string(),
  stackHeading: z.string(),
  linksHeading: z.string(),
  screenshotCaption: z.string(),
  backLabel: z.string(),
  nextLabel: z.string(),
  viewLabel: z.string(),
});

const researchPage = pageFile('research', {
  title: z.string(),
  description: z.string(),
  theme: z.string(),
  summary: z.string(),
  summaryHeading: z.string(),
  relatedHeading: z.string(),
  related: z.array(z.string()).default([]),
});

const aboutPage = pageFile('about', {
  title: z.string(),
  description: z.string(),
  affiliation: z.string(),
  bio: z.array(z.string()).min(1),
  linksHeading: z.string(),
  colophon: z.string(),
});

const contactPage = pageFile('contact', {
  title: z.string(),
  description: z.string(),
  lead: z.string(),
  email: z.email().optional(),
  emailNote: z.string(),
  links: z.array(
    z.object({
      label: z.string(),
      handle: z.string(),
      href: z.string(),
      note: z.string(),
      showOnHome: z.boolean().default(false),
    }),
  ),
});

const notFoundPage = pageFile('404', {
  title: z.string(),
  heading: z.string(),
  description: z.string(),
  lead: z.string(),
  linkLabel: z.string(),
});

// The address is shared by both languages and written only in pages/ja/contact.md.
export const collections = { projects, site, home, projectsPage, researchPage, aboutPage, contactPage, notFoundPage };
