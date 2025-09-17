
'use client';

import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRole } from '@/hooks/use-role';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SignupForm from './_components/signup-form';

export default function UsersPage() {
  const [currentUser, loadingAuth] = useAuthState(auth);
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


  const isLoading = loadingAuth || loadingRole;

  if (isLoading || currentUserRole !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // A função onFinished pode ser um brinde para resetar o formulário ou mostrar uma mensagem de sucesso
  const handleUserCreated = () => {
    toast({
        title: 'Usuário Criado!',
        description: 'O novo usuário foi criado com sucesso na Autenticação.',
    })
  }

  return <SignupForm onFinished={handleUserCreated} />;
}
