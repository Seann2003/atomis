import { ElementData, CombinationResult } from './types';

export const ELEMENTS: ElementData[] = [
  { symbol: 'H', name: 'Hydrogen', color: '#00FFFF', atomicNumber: 1, description: 'Lightest element' },
  { symbol: 'O', name: 'Oxygen', color: '#FF4444', atomicNumber: 8, description: 'Life supporter' },
  { symbol: 'Na', name: 'Sodium', color: '#FFFF00', atomicNumber: 11, description: 'Reactive metal' },
  { symbol: 'Cl', name: 'Chlorine', color: '#00FF00', atomicNumber: 17, description: 'Toxic gas' },
  { symbol: 'C', name: 'Carbon', color: '#AAAAAA', atomicNumber: 6, description: 'Life basis' },
  { symbol: 'Fe', name: 'Iron', color: '#FF8800', atomicNumber: 26, description: 'Metal' },
];

export const COMBINATIONS: CombinationResult[] = [
  {
    elements: ['H', 'O'],
    result: { symbol: 'H2O', name: 'Water', color: '#4488FF', atomicNumber: 0, description: 'Essential for life' }
  },
  {
    elements: ['O', 'H'],
    result: { symbol: 'H2O', name: 'Water', color: '#4488FF', atomicNumber: 0, description: 'Essential for life' }
  },
  {
    elements: ['Na', 'Cl'],
    result: { symbol: 'NaCl', name: 'Salt', color: '#FFFFFF', atomicNumber: 0, description: 'Table salt' }
  },
  {
    elements: ['Cl', 'Na'],
    result: { symbol: 'NaCl', name: 'Salt', color: '#FFFFFF', atomicNumber: 0, description: 'Table salt' }
  },
  {
    elements: ['H', 'Cl'],
    result: { symbol: 'HCl', name: 'Hydrochloric Acid', color: '#CC00FF', atomicNumber: 0, description: 'Strong acid' }
  },
  {
    elements: ['Cl', 'H'],
    result: { symbol: 'HCl', name: 'Hydrochloric Acid', color: '#CC00FF', atomicNumber: 0, description: 'Strong acid' }
  },
  {
    elements: ['C', 'O'],
    result: { symbol: 'CO2', name: 'Carbon Dioxide', color: '#888888', atomicNumber: 0, description: 'Greenhouse gas' }
  },
  {
    elements: ['O', 'C'],
    result: { symbol: 'CO2', name: 'Carbon Dioxide', color: '#888888', atomicNumber: 0, description: 'Greenhouse gas' }
  },
];

export const GESTURE_COOLDOWN = 1000; // ms
