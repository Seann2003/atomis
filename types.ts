export enum ElementType {
  HYDROGEN = 'Hydrogen',
  CARBON = 'Carbon',
  GOLD = 'Gold'
}

export enum ShapeTemplate {
  ATOM = 'Atom',
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  FIREWORKS = 'Fireworks'
}

export interface ParticleConfig {
  color: string;
  count: number;
  size: number;
  description?: string;
}

export interface HandState {
  isTracking: boolean;
  separation: number; // 0 to 1 (normalized distance between hands)
  tension: number; // 0 to 1 (clenched fist or pinch intensity)
  position: [number, number, number]; // Average center of hands
}

export const ELEMENT_CONFIGS: Record<ElementType, ParticleConfig> = {
  [ElementType.HYDROGEN]: {
    color: '#00BFFF',
    count: 200,
    size: 0.8,
  },
  [ElementType.CARBON]: {
    color: '#A9A9A9',
    count: 600,
    size: 0.5,
  },
  [ElementType.GOLD]: {
    color: '#FFD700',
    count: 1500,
    size: 0.3,
  }
};
