// Types shared by the form island (src/components/form) and its framework-free helpers.
import type { Flow, FlowCopy } from '../flow/schema';
import type { AnswerValue, Product } from '../flow/types';

/**
 * The page the form runs on: /vergelijken (the visitor picks the product on step 1) or
 * /vergelijken/<product> (preselected). Each has its own sessionStorage entry.
 */
export type FormEntry = 'vergelijken' | Product;

/** The interface copy the island needs (_copy.json without the page-level parts). */
export type FormCopy = Omit<FlowCopy, 'panel' | 'pages'>;

/** The resolved flows the page passes: one on a product page, all three on /vergelijken. */
export type FormFlows = Partial<Record<Product, Flow>>;

/**
 * Fixed for the whole form session (docs/FLOWS.md): set once when the form mounts, so conditions
 * on them never change while the visitor fills the form in.
 */
export type FormFlags = { preselected: boolean; energy_preselected: boolean };

/** The visitor's own answers, as stored (never implied answers such as energy_type). */
export type OwnAnswers = Record<string, AnswerValue>;

/** A responsive image resolved at build time (the island can't use astro:assets). */
export type ResolvedImage = {
  src: string;
  width: number;
  height: number;
  /** <source> elements, best format first. */
  sources: { type: string; srcset: string }[];
  sizes: string;
};

/** Side panel of one product (Figma 88:7430). */
export type FormPanel = { title: string; body: string; image: ResolvedImage };
