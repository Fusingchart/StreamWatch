import { PollutionClass, Severity } from '../types';

export const POLLUTION_CLASSES: Record<
  PollutionClass,
  { label: string; severity: Severity; color: string; agencies: string[] }
> = {
  oil_sheen: {
    label: 'Oil Sheen',
    severity: 'HIGH',
    color: '#FF6B35',
    agencies: ['spills@ecy.wa.gov'],
  },
  foam_suds: {
    label: 'Foam / Suds',
    severity: 'HIGH',
    color: '#FF9F1C',
    agencies: ['spills@ecy.wa.gov'],
  },
  algal_bloom: {
    label: 'Algal Bloom',
    severity: 'MEDIUM',
    color: '#2EC4B6',
    agencies: [], // resolved at runtime by county
  },
  discoloration: {
    label: 'Discoloration',
    severity: 'MEDIUM',
    color: '#8B4513',
    agencies: [], // resolved at runtime by county
  },
  solid_debris: {
    label: 'Solid Debris',
    severity: 'MEDIUM',
    color: '#6B6B6B',
    agencies: ['ecology.waste@wa.gov'],
  },
  clean_water: {
    label: 'Clean Water',
    severity: 'NONE',
    color: '#3A86FF',
    agencies: [],
  },
};

export const SPILLS_HOTLINE = '800-258-5990';
