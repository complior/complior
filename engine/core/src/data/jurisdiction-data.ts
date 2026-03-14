import { z } from 'zod';

export const JurisdictionSchema = z.object({
  country_code: z.string().length(2),
  country_name: z.string(),
  msa_name: z.string(),
  msa_url: z.string().url(),
  msa_contact: z.string(),
  local_requirements: z.array(z.string()),
  enforcement_date: z.string(),
  language: z.string(),
  notes: z.string().optional(),
});

export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

// Import all 30 jurisdiction JSON files at compile time
import atData from '../../data/regulations/jurisdictions/at.json' with { type: 'json' };
import beData from '../../data/regulations/jurisdictions/be.json' with { type: 'json' };
import bgData from '../../data/regulations/jurisdictions/bg.json' with { type: 'json' };
import hrData from '../../data/regulations/jurisdictions/hr.json' with { type: 'json' };
import cyData from '../../data/regulations/jurisdictions/cy.json' with { type: 'json' };
import czData from '../../data/regulations/jurisdictions/cz.json' with { type: 'json' };
import dkData from '../../data/regulations/jurisdictions/dk.json' with { type: 'json' };
import eeData from '../../data/regulations/jurisdictions/ee.json' with { type: 'json' };
import fiData from '../../data/regulations/jurisdictions/fi.json' with { type: 'json' };
import frData from '../../data/regulations/jurisdictions/fr.json' with { type: 'json' };
import deData from '../../data/regulations/jurisdictions/de.json' with { type: 'json' };
import grData from '../../data/regulations/jurisdictions/gr.json' with { type: 'json' };
import huData from '../../data/regulations/jurisdictions/hu.json' with { type: 'json' };
import ieData from '../../data/regulations/jurisdictions/ie.json' with { type: 'json' };
import itData from '../../data/regulations/jurisdictions/it.json' with { type: 'json' };
import lvData from '../../data/regulations/jurisdictions/lv.json' with { type: 'json' };
import ltData from '../../data/regulations/jurisdictions/lt.json' with { type: 'json' };
import luData from '../../data/regulations/jurisdictions/lu.json' with { type: 'json' };
import mtData from '../../data/regulations/jurisdictions/mt.json' with { type: 'json' };
import nlData from '../../data/regulations/jurisdictions/nl.json' with { type: 'json' };
import plData from '../../data/regulations/jurisdictions/pl.json' with { type: 'json' };
import ptData from '../../data/regulations/jurisdictions/pt.json' with { type: 'json' };
import roData from '../../data/regulations/jurisdictions/ro.json' with { type: 'json' };
import skData from '../../data/regulations/jurisdictions/sk.json' with { type: 'json' };
import siData from '../../data/regulations/jurisdictions/si.json' with { type: 'json' };
import esData from '../../data/regulations/jurisdictions/es.json' with { type: 'json' };
import seData from '../../data/regulations/jurisdictions/se.json' with { type: 'json' };
import isData from '../../data/regulations/jurisdictions/is.json' with { type: 'json' };
import liData from '../../data/regulations/jurisdictions/li.json' with { type: 'json' };
import noData from '../../data/regulations/jurisdictions/no.json' with { type: 'json' };

const RAW_DATA = [
  atData, beData, bgData, hrData, cyData, czData, dkData, eeData, fiData, frData,
  deData, grData, huData, ieData, itData, lvData, ltData, luData, mtData, nlData,
  plData, ptData, roData, skData, siData, esData, seData, isData, liData, noData,
];

const ALL_JURISDICTIONS: readonly Jurisdiction[] = RAW_DATA.map(d => JurisdictionSchema.parse(d));

const jurisdictionMap = new Map<string, Jurisdiction>(
  ALL_JURISDICTIONS.map(j => [j.country_code.toLowerCase(), j])
);

export const getJurisdiction = (code: string): Jurisdiction | undefined =>
  jurisdictionMap.get(code.toLowerCase());

export const listJurisdictions = (): readonly Jurisdiction[] =>
  ALL_JURISDICTIONS;
