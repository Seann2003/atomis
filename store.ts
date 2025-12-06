import { create } from 'zustand';
import { ElementType, ShapeTemplate } from './types';

interface AppState {
  selectedElement: ElementType;
  selectedTemplate: ShapeTemplate;
  customColor: string;
  aiInsight: string;
  isLoadingInsight: boolean;
  setElement: (el: ElementType) => void;
  setTemplate: (temp: ShapeTemplate) => void;
  setCustomColor: (color: string) => void;
  setAiInsight: (text: string) => void;
  setLoadingInsight: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedElement: ElementType.HYDROGEN,
  selectedTemplate: ShapeTemplate.ATOM,
  customColor: '#00BFFF', // Default matches Hydrogen
  aiInsight: "Select an element and ask AI for an insight!",
  isLoadingInsight: false,
  setElement: (el) => set({ selectedElement: el }),
  setTemplate: (temp) => set({ selectedTemplate: temp }),
  setCustomColor: (color) => set({ customColor: color }),
  setAiInsight: (text) => set({ aiInsight: text }),
  setLoadingInsight: (loading) => set({ isLoadingInsight: loading }),
}));
