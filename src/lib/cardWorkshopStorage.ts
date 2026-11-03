import type { WorkshopCard } from './cardWorkshop';

export interface PersonalWorkshopCard { card: WorkshopCard; blob: Blob }
const DB = 'swl.card-workshop.v1';
const STORE = 'personal-cards';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'card.id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Le stockage local des cartes est indisponible.'));
  });
}
export async function readPersonalCards(): Promise<PersonalWorkshopCard[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Impossible de lire les cartes personnelles.'));
    });
  } finally { db.close(); }
}
export async function savePersonalCard(entry: PersonalWorkshopCard): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('La carte n’a pas pu être enregistrée sur cet appareil.'));
      tx.onabort = () => reject(new Error('Enregistrement annulé : stockage peut-être plein.'));
    });
  } finally { db.close(); }
}
export async function deletePersonalCard(id: string): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('Suppression impossible.'));
    });
  } finally { db.close(); }
}
export async function validateWorkshopImage(file: Blob): Promise<void> {
  if (file.size > 8 * 1024 * 1024 || file.size < 24) throw new Error('Image attendue : PNG, JPEG ou WebP, de 8 Mo au maximum.');
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!png && !jpeg && !webp) throw new Error('Le contenu du fichier n’est pas une image PNG, JPEG ou WebP.');
}
