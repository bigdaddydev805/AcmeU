import fs from 'node:fs';
import { fetchExternal } from './http';

const DOCTYPE_RE = /<!DOCTYPE[^[>]*(?:\[([\s\S]*?)\])?\s*>/i;
const ENTITY_SYSTEM_RE = /<!ENTITY\s+(\S+)\s+SYSTEM\s+["']([^"']+)["']\s*>/gi;
const ENTITY_LITERAL_RE = /<!ENTITY\s+(\S+)\s+["']([^"']*)["']\s*>/gi;

const MAX_ENTITY_PASSES = 8;

async function resolveSystemEntity(uri: string): Promise<string> {
  if (uri.startsWith('file://')) {
    return fs.promises.readFile(uri.slice('file://'.length), 'utf8');
  }
  if (uri.startsWith('/') || uri.startsWith('./')) {
    return fs.promises.readFile(uri, 'utf8');
  }
  const response = await fetchExternal(uri, { responseType: 'text' });
  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}

async function collectEntities(subset: string): Promise<Record<string, string>> {
  const entities: Record<string, string> = {};

  for (const match of subset.matchAll(ENTITY_LITERAL_RE)) {
    entities[match[1]] = match[2];
  }

  for (const match of subset.matchAll(ENTITY_SYSTEM_RE)) {
    try {
      entities[match[1]] = await resolveSystemEntity(match[2]);
    } catch {
      entities[match[1]] = '';
    }
  }

  return entities;
}

function substitute(document: string, entities: Record<string, string>): string {
  let output = document;
  for (let pass = 0; pass < MAX_ENTITY_PASSES; pass += 1) {
    const before = output;
    output = output.replace(/&([A-Za-z_][\w.-]*);/g, (whole, name: string) =>
      Object.prototype.hasOwnProperty.call(entities, name) ? entities[name] : whole,
    );
    if (output === before) break;
  }
  return output;
}

export async function expandDocument(xml: string): Promise<string> {
  const doctype = DOCTYPE_RE.exec(xml);
  if (!doctype) return xml;

  const entities = doctype[1] ? await collectEntities(doctype[1]) : {};
  const body = xml.replace(DOCTYPE_RE, '');
  return substitute(body, entities);
}

export interface RosterEntry {
  email: string;
  displayName: string;
  role: string;
  externalId?: string;
}

function textOf(block: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  if (!match) return '';
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

export async function parseRoster(xml: string): Promise<RosterEntry[]> {
  const expanded = await expandDocument(xml);
  const entries: RosterEntry[] = [];

  for (const match of expanded.matchAll(/<(?:learner|member|person)\b[\s\S]*?<\/(?:learner|member|person)>/gi)) {
    const block = match[0];
    const email = textOf(block, 'email');
    if (!email) continue;
    entries.push({
      email,
      displayName: textOf(block, 'name') || textOf(block, 'displayName') || email,
      role: (textOf(block, 'role') || 'learner').toLowerCase(),
      externalId: textOf(block, 'externalId') || undefined,
    });
  }

  return entries;
}
