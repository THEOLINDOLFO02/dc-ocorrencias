import { Agency } from '../types';

export const DEFAULT_AGENCIES: Agency[] = [
  { id: 'ambulancia', label: 'Ambulância',  selected: false, vehicles: '', responsible: '' },
  { id: 'bombeiro',   label: 'Bombeiro',    selected: false, vehicles: '', responsible: '' },
  { id: 'cetesb',     label: 'CETESB',      selected: false, vehicles: '', responsible: '' },
  { id: 'gcm',        label: 'GCM',         selected: false, vehicles: '', responsible: '' },
  { id: 'obras',      label: 'Obras',       selected: false, vehicles: '', responsible: '' },
  { id: 'pm-sp',      label: 'PM-SP',       selected: false, vehicles: '', responsible: '' },
  { id: 'pol-civil',  label: 'Pol. Civil',  selected: false, vehicles: '', responsible: '' },
  { id: 'transito',   label: 'Trânsito',    selected: false, vehicles: '', responsible: '' },
  { id: 'zoonoses',   label: 'Zoonoses',    selected: false, vehicles: '', responsible: '' },
];
