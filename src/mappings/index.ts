import s4Mapping from './traktor-s4-mk3.json';
import ddj400Mapping from './pioneer-ddj-400.json';
import { MidiMapping } from '../../types';

interface MappingFile {
  name: string;
  mapping: MidiMapping;
  identifiers: string[];
}

// Liste aller bekannten Mappings
const knownMappings: MappingFile[] = [
  {
    name: s4Mapping.name,
    // KORREKTUR: Wir teilen TypeScript explizit mit, dass das Mapping dem korrekten Typ entspricht.
    mapping: s4Mapping.mapping as MidiMapping,
    identifiers: ['Traktor Kontrol S4 MK3'],
  },
  {
    name: ddj400Mapping.name,
    // KORREKTUR: Wir teilen TypeScript explizit mit, dass das Mapping dem korrekten Typ entspricht.
    mapping: ddj400Mapping.mapping as MidiMapping,
    identifiers: ['DDJ-400'], 
  }
];

// Funktion zur Erkennung des Mappings anhand des Gerätenamens
export const detectMappingForDevice = (deviceName: string): { name: string; mapping: MidiMapping } | null => {
  for (const knownMap of knownMappings) {
    for (const id of knownMap.identifiers) {
      if (deviceName.includes(id)) {
        return { name: knownMap.name, mapping: knownMap.mapping };
      }
    }
  }
  return null;
};
