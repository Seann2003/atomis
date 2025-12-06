import { ElementData, CombinationResult } from "./types";

export const ELEMENTS: ElementData[] = [
  {
    symbol: "H",
    name: "Hydrogen",
    color: "#00FFFF",
    atomicNumber: 1,
    description: "Lightest element",
  },
  {
    symbol: "O",
    name: "Oxygen",
    color: "#FF4444",
    atomicNumber: 8,
    description: "Life supporter",
  },
  {
    symbol: "Na",
    name: "Sodium",
    color: "#FFFF00",
    atomicNumber: 11,
    description: "Reactive metal",
  },
  {
    symbol: "Cl",
    name: "Chlorine",
    color: "#00FF00",
    atomicNumber: 17,
    description: "Toxic gas",
  },
  {
    symbol: "C",
    name: "Carbon",
    color: "#AAAAAA",
    atomicNumber: 6,
    description: "Life basis",
  },
  {
    symbol: "Fe",
    name: "Iron",
    color: "#FF8800",
    atomicNumber: 26,
    description: "Metal",
  },
  {
    symbol: "N",
    name: "Nitrogen",
    color: "#5500FF",
    atomicNumber: 7,
    description: "Atmosphere gas",
  },
  {
    symbol: "S",
    name: "Sulfur",
    color: "#FFDD00",
    atomicNumber: 16,
    description: "Yellow crystal",
  },
  {
    symbol: "Ca",
    name: "Calcium",
    color: "#EEEEEE",
    atomicNumber: 20,
    description: "Bone mineral",
  },
  {
    symbol: "Ho",
    name: "Holmium",
    color: "#FF6B9D",
    atomicNumber: 67,
    description: "Rare earth metal",
  },
];

export const COMBINATIONS: CombinationResult[] = [
  {
    elements: ["H", "O"],
    result: {
      symbol: "H2O",
      name: "Water",
      color: "#4488FF",
      atomicNumber: 0,
      description: "Essential for life",
    },
    requiredCatalyst: "heat",
  },
  {
    elements: ["Na", "Cl"],
    result: {
      symbol: "NaCl",
      name: "Salt",
      color: "#FFFFFF",
      atomicNumber: 0,
      description: "Table salt",
    },
  },
  // Sodium + Water (Safe without heat)
  {
    elements: ["Na", "H2O"],
    result: {
      symbol: "NaOH",
      name: "Sodium Hydroxide",
      color: "#DDDDDD",
      atomicNumber: 0,
      description: "Lye",
    },
  },
  {
    elements: ["H", "Cl"],
    result: {
      symbol: "HCl",
      name: "Hydrochloric Acid",
      color: "#CC00FF",
      atomicNumber: 0,
      description: "Strong acid",
    },
  },
  {
    elements: ["C", "O"],
    result: {
      symbol: "CO2",
      name: "Carbon Dioxide",
      color: "#888888",
      atomicNumber: 0,
      description: "Greenhouse gas",
    },
    requiredCatalyst: "heat",
  },
  {
    elements: ["N", "H"],
    result: {
      symbol: "NH3",
      name: "Ammonia",
      color: "#0000FF",
      atomicNumber: 0,
      description: "Cleaner",
    },
    requiredCatalyst: "chemical",
  },
  {
    elements: ["Fe", "O"],
    result: {
      symbol: "Fe2O3",
      name: "Iron Oxide",
      color: "#8B0000",
      atomicNumber: 0,
      description: "Rust",
    },
  },
  {
    elements: ["Ca", "Cl"],
    result: {
      symbol: "CaCl2",
      name: "Calcium Chloride",
      color: "#DDDDDD",
      atomicNumber: 0,
      description: "De-icing salt",
    },
  },
  {
    elements: ["N", "O"],
    result: {
      symbol: "NO2",
      name: "Nitrogen Dioxide",
      color: "#993300",
      atomicNumber: 0,
      description: "Pollutant",
    },
    requiredCatalyst: "light",
  },
  // Additional Base Element Combinations
  {
    elements: ["S", "O"],
    result: {
      symbol: "SO2",
      name: "Sulfur Dioxide",
      color: "#FFAA00",
      atomicNumber: 0,
      description: "Acid rain component",
    },
    requiredCatalyst: "heat",
  },
  {
    elements: ["C", "H"],
    result: {
      symbol: "CH4",
      name: "Methane",
      color: "#88CC88",
      atomicNumber: 0,
      description: "Natural gas",
    },
    requiredCatalyst: "heat",
  },
  {
    elements: ["S", "H"],
    result: {
      symbol: "H2S",
      name: "Hydrogen Sulfide",
      color: "#AA8800",
      atomicNumber: 0,
      description: "Rotten egg gas",
    },
  },
  // Compound-to-Compound Combinations
  {
    elements: ["H2O", "CO2"],
    result: {
      symbol: "H2CO3",
      name: "Carbonic Acid",
      color: "#4488AA",
      atomicNumber: 0,
      description: "Soda water",
    },
  },
  {
    elements: ["HCl", "NaOH"],
    result: {
      symbol: "NaCl",
      name: "Salt",
      color: "#FFFFFF",
      atomicNumber: 0,
      description: "Neutralization reaction",
    },
  },
  {
    elements: ["NH3", "HCl"],
    result: {
      symbol: "NH4Cl",
      name: "Ammonium Chloride",
      color: "#CCCCCC",
      atomicNumber: 0,
      description: "Smoke",
    },
  },
];

export const GESTURE_COOLDOWN = 1000; // ms
