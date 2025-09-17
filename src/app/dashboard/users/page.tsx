
'use client';

import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRole } from '@/hooks/use-role';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SignupForm from './_components/signup-form';

export default function UsersPage() {
  const [currentUser] = useAuthState(auth);
  const { role: currentUserRole, loadingRole } = useRole(currentUser?.uid);
  const router = useRouter();

  useEffect(() => {
    if (!loadingRole && currentUserRole !== 'admin') {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [currentUserRole, loadingRole, router]);


  if (loadingRole || currentUserRole !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <SignupForm />;
}
