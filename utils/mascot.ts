
import { ElementData } from '../types';

export function getMascotFact(el: ElementData): string {
  if (el.atomicNumber === 0) return "This is a compound created by bonding atoms together!";
  if (el.symbol === 'H') return "Hydrogen is the most abundant chemical substance in the universe.";
  if (el.symbol === 'O') return "Oxygen makes up about 21% of Earth's atmosphere.";
  if (el.symbol === 'C') return "Carbon is known as the 'King of Elements' due to its ability to form complex molecules.";
  if (el.symbol === 'Na') return "Sodium is a soft metal that reacts vigorously with water!";
  if (el.symbol === 'Cl') return "Chlorine is a greenish-yellow gas that is toxic in high concentrations.";
  if (el.symbol === 'NaCl') return "Sodium Chloride is essential for life and has been used as currency in history!";
  return el.description;
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

