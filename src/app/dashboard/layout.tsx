"use client";

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { Loader2 } from 'lucide-react';
import type { User } from 'firebase/auth';

type AdminContextType = {
  isAdmin: boolean;
  isClaimsLoading: boolean;
};

const AdminContext = createContext<AdminContextType>({ isAdmin: false, isClaimsLoading: true });

export const useAdmin = () => useContext(AdminContext);

async function getAdminStatus(user: User | null): Promise<boolean> {
  if (!user) return false;
  try {
    const idTokenResult = await user.getIdTokenResult(true); // Force refresh
    return idTokenResult.claims.admin === true;
  } catch (error) {
    console.error("Error fetching user claims:", error);
    return false;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    
    setIsClaimsLoading(true);
    getAdminStatus(user).then(adminStatus => {
      setIsAdmin(adminStatus);
      setIsClaimsLoading(false);
    });

  }, [user, loading, router]);

  if (loading || isClaimsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; 
  }

  return (
    <AdminContext.Provider value={{ isAdmin, isClaimsLoading }}>
      {children}
    </AdminContext.Provider>
  );
}
