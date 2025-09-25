import React, { useState } from 'react';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust this path
import { INITIAL_PRODUCTS } from './catalog'; // Adjust this path

export const SeedDatabase: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to seed');

 

  const handleSeed = async () => {
    setStatus('Uploading...');
    try {
      // Initialize a batch
      const batch = writeBatch(db);
      
      INITIAL_PRODUCTS.forEach((product) => {
        // Create a reference using the product.id as the document ID
        const docRef = doc(db, 'products', product.id);
        // Queue the product data into the batch
        batch.set(docRef, product);
      });
      
      // Commit the batch to Firebase
      await batch.commit();
      setStatus('Success! 42 products uploaded.');
    } catch (error) {
      console.error("Error seeding database:", error);
      setStatus('Failed. Check console.');
    }
  };

  return (
    <div >
      <button 
        onClick={handleSeed}
        className='hover:bg-[#FEF3C7] px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink border-[#D4CFC7] bg-white text-[#52525B]'
      >
        Baby Bau
      </button>
      
      <p className="text-xs text-[#52525B] mt-2">{status}</p>
    </div>
  );
};