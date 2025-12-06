
import { ElementData } from '../types';

export function getMascotFact(el: ElementData): string {
  // Base Elements (Level 1)
  if (el.symbol === 'H') return "Hydrogen is the most abundant chemical substance in the universe. It's the lightest element and powers stars through nuclear fusion.";
  if (el.symbol === 'O') return "Oxygen makes up about 21% of Earth's atmosphere and is essential for respiration. Most living organisms depend on it.";
  if (el.symbol === 'C') return "Carbon is known as the 'King of Elements' due to its ability to form complex molecules. It's the basis of all organic life.";
  if (el.symbol === 'Na') return "Sodium is a soft, silvery metal that reacts vigorously with water. It's essential for nerve function and fluid balance.";
  if (el.symbol === 'Cl') return "Chlorine is a greenish-yellow gas that is toxic in high concentrations. It's used to purify water and in many industrial processes.";
  if (el.symbol === 'Fe') return "Iron is the most common element on Earth by mass. It's crucial for blood production and has shaped human civilization through tools and structures.";
  if (el.symbol === 'N') return "Nitrogen makes up 78% of Earth's atmosphere. It's essential for proteins and DNA, forming the backbone of all living organisms.";
  if (el.symbol === 'S') return "Sulfur is a yellow crystalline solid with a distinct smell. It's vital for amino acids and is found in volcanic regions.";
  if (el.symbol === 'Ca') return "Calcium is the most abundant metal in the human body. It's essential for strong bones, teeth, and proper muscle function.";
  
  // Compounds (Level 2)
  if (el.symbol === 'H2O') return "Water is the universal solvent and covers 71% of Earth's surface. It's essential for all known forms of life and exists in three states naturally.";
  if (el.symbol === 'NaCl') return "Sodium Chloride, or table salt, is essential for life. It regulates fluid balance, nerve function, and has been used as currency throughout history.";
  if (el.symbol === 'NaOH') return "Sodium Hydroxide, also known as lye, is a strong base used in soap making and industrial processes. Handle with care—it's highly corrosive!";
  if (el.symbol === 'HCl') return "Hydrochloric Acid is a strong acid found naturally in your stomach, helping digest food. Industrially, it's used in metal cleaning and processing.";
  if (el.symbol === 'CO2') return "Carbon Dioxide is a greenhouse gas essential for plant photosynthesis. While necessary for life, excess amounts contribute to climate change.";
  if (el.symbol === 'NH3') return "Ammonia is a colorless gas with a pungent smell. It's widely used in fertilizers and cleaning products, and is crucial for the nitrogen cycle.";
  if (el.symbol === 'Fe2O3') return "Iron Oxide, commonly known as rust, forms when iron reacts with oxygen and water. It's a natural process that weakens metal structures over time.";
  if (el.symbol === 'CaCl2') return "Calcium Chloride is used for de-icing roads and as a food preservative. It's highly hygroscopic, meaning it absorbs moisture from the air.";
  if (el.symbol === 'NO2') return "Nitrogen Dioxide is a reddish-brown toxic gas and a major air pollutant. It forms from combustion processes and contributes to smog formation.";
  if (el.symbol === 'SO2') return "Sulfur Dioxide is a colorless gas with a sharp smell. It's produced by volcanic activity and industrial processes, and contributes to acid rain.";
  if (el.symbol === 'CH4') return "Methane is the primary component of natural gas. It's a potent greenhouse gas and is produced by both natural processes and human activities.";
  if (el.symbol === 'H2S') return "Hydrogen Sulfide is a toxic gas with the characteristic smell of rotten eggs. It's produced by bacterial breakdown of organic matter in the absence of oxygen.";
  if (el.symbol === 'H2CO3') return "Carbonic Acid forms when carbon dioxide dissolves in water. It's what gives carbonated beverages their fizz and plays a role in ocean acidification.";
  if (el.symbol === 'NH4Cl') return "Ammonium Chloride is a white crystalline salt. When heated, it produces white smoke, which is why it's used in smoke machines and as a cough medicine.";
  
  // Fallback for any other compounds
  if (el.atomicNumber === 0) return "This is a compound created by bonding atoms together! Compounds have unique properties different from their individual elements.";
  
  // Final fallback to element description
  return el.description || "Select an element to learn more about its properties and uses!";
}

export function getSystemMessage(status: string): string {
  if (status.includes("LAB READY")) return "I'm ready for the next experiment! Pick two elements.";
  if (status.includes("HOLD TO FUSE")) return "Stabilizing reaction... Hold it steady!";
  if (status.includes("FUSION SUCCESS")) return "Amazing! A stable compound has been formed!";
  if (status.includes("Failed")) return "Oops! We need a catalyst to make this reaction work.";
  if (status.includes("Incompatible")) return "Careful! Those elements don't seem to want to bond.";
  if (status.includes("SAVED")) return "Great work! I've added that to your collection.";
  if (status.includes("SWAPPED")) return "Element selected. What will you pair it with?";
  if (status.includes("CATALYST ACTIVE")) return "Catalyst engaged! This should energize the reaction.";
  return "Observing experiment parameters...";
}

