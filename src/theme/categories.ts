export type CategorySlug =
  | 'development'
  | 'knowledge'
  | 'fitness'
  | 'creativity'
  | 'social'
  | 'exploration'
  | 'life-management'
  | 'finance';

export const categoryColorBySlug: Record<CategorySlug, string> = {
  development: '#4D8DF5',
  knowledge: '#9A67EA',
  fitness: '#54D18B',
  creativity: '#DA4B8F',
  social: '#EEAB42',
  exploration: '#2FC8E8',
  'life-management': '#7E89A3',
  finance: '#C6A24B',
};