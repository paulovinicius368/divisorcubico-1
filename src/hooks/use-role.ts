
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type UserRole = 'admin' | 'user' | null;

export function useRole(uid: string | undefined) {
  const [role, setRole] = useState<UserRole>(null);
  const [loadingRole, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setRole(null);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          setRole(doc.data()?.role || 'user');
        } else {
          // Default to 'user' if document doesn't exist
          setRole('user');
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching user role:", error);
        setRole('user'); // Fallback to basic user on error
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { role, loadingRole };
}

    