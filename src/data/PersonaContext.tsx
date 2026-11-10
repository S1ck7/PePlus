import { createContext, useContext, useState, type ReactNode } from 'react';

import { listPersonas } from './index';

type PersonaState = [string, (id: string) => void];

const PersonaContext = createContext<PersonaState | null>(null);

/** Holds the demo persona chosen on any screen so every tab shows the same person. */
export function PersonaProvider({ children }: { children: ReactNode }) {
  const state = useState<string>(listPersonas()[0]?.id ?? 'persona-1');
  return <PersonaContext.Provider value={state}>{children}</PersonaContext.Provider>;
}

/** Drop-in replacement for useState: returns [selectedPersonaId, setSelectedPersonaId]. */
export function useSelectedPersonaId(): PersonaState {
  const state = useContext(PersonaContext);
  if (!state) throw new Error('useSelectedPersonaId must be used inside PersonaProvider');
  return state;
}
