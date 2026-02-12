
export interface CountryInfo {
  name: string;
  capital: string;
  coordinates: [number, number]; // [lon, lat]
  facts: string[];
  description: string;
  landscapeDescription: string;
  culturalEssence: string;
}

export interface GlobeProps {
  onCountrySelect: (countryName: string) => void;
  targetCoordinates?: [number, number];
  isCinematicMode: boolean;
  onTransitionEnd?: () => void;
}

export interface VideoState {
  status: 'idle' | 'loading' | 'completed' | 'error';
  url?: string;
  progressMessage?: string;
  error?: string;
}
