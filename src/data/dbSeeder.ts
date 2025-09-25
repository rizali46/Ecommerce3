import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_PRODUCTS } from './catalog';

export const uploadCatalogToFirestore = async (): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    
    INITIAL_PRODUCTS.forEach((product) => {
      const docRef = doc(db, 'products', product.id);
      batch.set(docRef, product);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error seeding database:", error);
    return false;
  }
};