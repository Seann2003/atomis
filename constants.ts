
import { ElementData, CombinationResult } from './types';

export const ELEMENTS: ElementData[] = [
  { 
    symbol: 'H', 
    name: 'Hydrogen', 
    color: '#00FFFF', 
    atomicNumber: 1, 
    description: 'The most abundant element in the universe, making up about 75% of its mass. Essential for stars to shine and water to form.', 
    level: 1 
  },
  { 
    symbol: 'O', 
    name: 'Oxygen', 
    color: '#FF4444', 
    atomicNumber: 8, 
    description: 'A highly reactive nonmetal and oxidizing agent that readily forms oxides with most elements. Crucial for respiration in most living organisms.', 
    level: 1 
  },
  { 
    symbol: 'Na', 
    name: 'Sodium', 
    color: '#FFFF00', 
    atomicNumber: 11, 
    description: 'A soft, silvery-white, highly reactive metal. It is an alkali metal that explodes when brought into contact with water.', 
    level: 1 
  },
  { 
    symbol: 'Cl', 
    name: 'Chlorine', 
    color: '#00FF00', 
    atomicNumber: 17, 
    description: 'A yellow-green gas at room temperature. It is an extremely reactive element and a strong oxidizing agent, often used as a disinfectant.', 
    level: 1 
  },
  { 
    symbol: 'C', 
    name: 'Carbon', 
    color: '#AAAAAA', 
    atomicNumber: 6, 
    description: 'The chemical backbone of all known life. It can form diamonds, graphite, and coal depending on how its atoms are arranged.', 
    level: 1 
  },
  { 
    symbol: 'Fe', 
    name: 'Iron', 
    color: '#FF8800', 
    atomicNumber: 26, 
    description: 'A metal that is the most common element on Earth by mass. It is vital for blood production in the human body and steel manufacturing.', 
    level: 1 
  },
  { 
    symbol: 'N', 
    name: 'Nitrogen', 
    color: '#5500FF', 
    atomicNumber: 7, 
    description: 'A colorless, odorless gas that makes up about 78% of Earth\'s atmosphere. It is a key building block of DNA and proteins.', 
    level: 1 
  },
  { 
    symbol: 'S', 
    name: 'Sulfur', 
    color: '#FFDD00', 
    atomicNumber: 16, 
    description: 'A bright yellow, brittle solid at room temperature. Historically known as "brimstone," it is essential for life but often associated with bad smells.', 
    level: 1 
  },
  { 
    symbol: 'Ca', 
    name: 'Calcium', 
    color: '#EEEEEE', 
    atomicNumber: 20, 
    description: 'An alkaline earth metal essential for living organisms, particularly in cell physiology and the mineralization of bones and shells.', 
    level: 1 
  },
];

export const COMBINATIONS: CombinationResult[] = [
  {
    elements: ['H', 'O'],
    result: { 
      symbol: 'H2O', 
      name: 'Water', 
      color: '#4488FF', 
      atomicNumber: 0, 
      description: 'A transparent, odorless, tasteless, and nearly colorless chemical substance. It is vital for all known forms of life and covers 71% of Earth\'s surface.', 
      level: 2 
    },
    requiredCatalyst: 'heat'
  },
  {
    elements: ['O', 'H'],
    result: { 
      symbol: 'H2O', 
      name: 'Water', 
      color: '#4488FF', 
      atomicNumber: 0, 
      description: 'A transparent, odorless, tasteless, and nearly colorless chemical substance. It is vital for all known forms of life and covers 71% of Earth\'s surface.', 
      level: 2 
    },
    requiredCatalyst: 'heat'
  },
  {
    elements: ['Na', 'Cl'],
    result: { 
      symbol: 'NaCl', 
      name: 'Salt', 
      color: '#FFFFFF', 
      atomicNumber: 0, 
      description: 'Sodium chloride, commonly known as salt. It is an ionic compound essential for life in small quantities and has been used for preserving food for millennia.', 
      level: 2 
    }
  },
  {
    elements: ['Cl', 'Na'],
    result: { 
      symbol: 'NaCl', 
      name: 'Salt', 
      color: '#FFFFFF', 
      atomicNumber: 0, 
      description: 'Sodium chloride, commonly known as salt. It is an ionic compound essential for life in small quantities and has been used for preserving food for millennia.', 
      level: 2 
    }
  },
  {
    elements: ['H', 'Cl'],
    result: { 
      symbol: 'HCl', 
      name: 'Hydrochloric Acid', 
      color: '#CC00FF', 
      atomicNumber: 0, 
      description: 'A colorless, corrosive, strong mineral acid. It is found naturally in gastric acid in the human digestive system.', 
      level: 2 
    }
  },
  {
    elements: ['Cl', 'H'],
    result: { 
      symbol: 'HCl', 
      name: 'Hydrochloric Acid', 
      color: '#CC00FF', 
      atomicNumber: 0, 
      description: 'A colorless, corrosive, strong mineral acid. It is found naturally in gastric acid in the human digestive system.', 
      level: 2 
    }
  },
  {
    elements: ['C', 'O'],
    result: { 
      symbol: 'CO2', 
      name: 'Carbon Dioxide', 
      color: '#888888', 
      atomicNumber: 0, 
      description: 'A colorless gas with a density about 53% higher than that of dry air. It is a key greenhouse gas and is produced during respiration and combustion.', 
      level: 2 
    },
    requiredCatalyst: 'heat'
  },
  {
    elements: ['O', 'C'],
    result: { 
      symbol: 'CO2', 
      name: 'Carbon Dioxide', 
      color: '#888888', 
      atomicNumber: 0, 
      description: 'A colorless gas with a density about 53% higher than that of dry air. It is a key greenhouse gas and is produced during respiration and combustion.', 
      level: 2 
    },
    requiredCatalyst: 'heat'
  },
  {
    elements: ['N', 'H'],
    result: { 
      symbol: 'NH3', 
      name: 'Ammonia', 
      color: '#0000FF', 
      atomicNumber: 0, 
      description: 'A compound of nitrogen and hydrogen. It is a colorless gas with a characteristic pungent smell, widely used in fertilizers and cleaning products.', 
      level: 2 
    },
    requiredCatalyst: 'chemical'
  },
  {
    elements: ['H', 'N'],
    result: { 
      symbol: 'NH3', 
      name: 'Ammonia', 
      color: '#0000FF', 
      atomicNumber: 0, 
      description: 'A compound of nitrogen and hydrogen. It is a colorless gas with a characteristic pungent smell, widely used in fertilizers and cleaning products.', 
      level: 2 
    },
    requiredCatalyst: 'chemical'
  },
  {
    elements: ['Fe', 'O'],
    result: { 
      symbol: 'Fe2O3', 
      name: 'Iron Oxide', 
      color: '#8B0000', 
      atomicNumber: 0, 
      description: 'Commonly known as rust. It forms when iron reacts with oxygen in the presence of water or air moisture, causing corrosion.', 
      level: 2 
    }
  },
  {
    elements: ['O', 'Fe'],
    result: { 
      symbol: 'Fe2O3', 
      name: 'Iron Oxide', 
      color: '#8B0000', 
      atomicNumber: 0, 
      description: 'Commonly known as rust. It forms when iron reacts with oxygen in the presence of water or air moisture, causing corrosion.', 
      level: 2 
    }
  },
  {
    elements: ['Ca', 'Cl'],
    result: { 
      symbol: 'CaCl2', 
      name: 'Calcium Chloride', 
      color: '#DDDDDD', 
      atomicNumber: 0, 
      description: 'A salt used for de-icing roads and brine for refrigeration plants. It is highly hygroscopic, meaning it absorbs water from the air.', 
      level: 2 
    }
  },
  {
    elements: ['Cl', 'Ca'],
    result: { 
      symbol: 'CaCl2', 
      name: 'Calcium Chloride', 
      color: '#DDDDDD', 
      atomicNumber: 0, 
      description: 'A salt used for de-icing roads and brine for refrigeration plants. It is highly hygroscopic, meaning it absorbs water from the air.', 
      level: 2 
    }
  },
  {
    elements: ['N', 'O'],
    result: { 
      symbol: 'NO2', 
      name: 'Nitrogen Dioxide', 
      color: '#993300', 
      atomicNumber: 0, 
      description: 'A reddish-brown gas with a biting, sharp odor. It is a significant air pollutant produced by internal combustion engines.', 
      level: 2 
    },
    requiredCatalyst: 'light'
  },
  {
    elements: ['O', 'N'],
    result: { 
      symbol: 'NO2', 
      name: 'Nitrogen Dioxide', 
      color: '#993300', 
      atomicNumber: 0, 
      description: 'A reddish-brown gas with a biting, sharp odor. It is a significant air pollutant produced by internal combustion engines.', 
      level: 2 
    },
    requiredCatalyst: 'light'
  },
];

export const GESTURE_COOLDOWN = 1000; // ms
