import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export type ProjectEntry = CollectionEntry<'projects'>;

/** The part of a project's URL: src/content/projects/en/tabisync.md becomes tabisync. */
export const projectSlug = (project: ProjectEntry): string => project.id.split('/').at(-1) ?? project.id;

/** Projects with published: true in one language, in the order set by their `order` value. */
export async function getProjects(lang: Lang): Promise<ProjectEntry[]> {
  const projects = await getCollection('projects', ({ id, data }) => id.startsWith(`${lang}/`) && data.published);
  return projects.sort((a, b) => a.data.order - b.data.order);
}

function required<Entry>(entry: Entry | undefined, file: string): Entry {
  if (!entry) throw new Error(`src/content/pages/${file}.md が見つかりません`);
  return entry;
}

export const getSite = async (lang: Lang) => required(await getEntry('site', `${lang}/site`), `${lang}/site`);
export const getHomePage = async (lang: Lang) => required(await getEntry('home', `${lang}/home`), `${lang}/home`);
export const getProjectsPage = async (lang: Lang) => required(await getEntry('projectsPage', `${lang}/projects`), `${lang}/projects`);
export const getResearchPage = async (lang: Lang) => required(await getEntry('researchPage', `${lang}/research`), `${lang}/research`);
export const getAboutPage = async (lang: Lang) => required(await getEntry('aboutPage', `${lang}/about`), `${lang}/about`);
export const getContactPage = async (lang: Lang) => required(await getEntry('contactPage', `${lang}/contact`), `${lang}/contact`);
export const getNotFoundPage = async (lang: Lang) => required(await getEntry('notFoundPage', `${lang}/404`), `${lang}/404`);
