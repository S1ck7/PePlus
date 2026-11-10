import { readFile } from 'node:fs/promises';

import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function seedOffers() {
  let credentials;
  try {
    credentials = JSON.parse(await readFile(new URL('../serviceAccount.json', import.meta.url), 'utf8'));
  } catch {
    console.error('Save a valid Firebase service account key as serviceAccount.json in the repository root.');
    process.exitCode = 1;
    return;
  }

  const offers = JSON.parse(await readFile(new URL('../data/bank-offers.json', import.meta.url), 'utf8'));
  const ids = new Set(offers.map(offer => offer.id));
  if (!offers.length || offers.length > 500 || ids.size !== offers.length ||
      [...ids].some(id => typeof id !== 'string' || !id || id.includes('/'))) {
    throw new Error('The offers file must contain 1–500 offers with unique document IDs.');
  }

  const app = initializeApp({ credential: cert(credentials) });
  try {
    const db = getFirestore(app);
    const batch = db.batch();
    for (const offer of offers) batch.set(db.collection('offers').doc(offer.id), offer);
    await batch.commit();
    console.log(`Seeded ${offers.length} offers in ${credentials.project_id}.`);
  } finally {
    await deleteApp(app);
  }
}

seedOffers().catch(error => {
  // SDK error messages can include configuration details. Print only the code.
  console.error(`Could not seed Firebase offers${error.code ? ` (${error.code})` : ''}.`);
  process.exitCode = 1;
});
