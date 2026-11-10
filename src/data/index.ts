/// <reference types="expo/types" />

import rawOffers from '../../data/bank-offers.json';
import type { BankOffer, Persona } from '../types';

const personaFiles = require.context('../../data', false, /^\.\/persona-[^/]+\.json$/);
const personas = personaFiles.keys().sort().map(path => personaFiles<Persona>(path));
const offers = rawOffers as BankOffer[];

export function listPersonas(): readonly Persona[] {
  return personas;
}

export function getPersona(id: string): Persona | undefined {
  return personas.find(persona => persona.id === id);
}

export function listBankOffers(): readonly BankOffer[] {
  return offers;
}
