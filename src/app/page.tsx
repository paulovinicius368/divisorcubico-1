"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (loading) {
      // Aguardando a verificação do estado de autenticação
      return;
    }
    if (user) {
      // Se o usuário está logado, vai para o dashboard
      router.replace('/dashboard');
    } else {
      // Se não está logado, vai para a página de login
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Exibe um indicador de carregamento enquanto o Firebase verifica o login
  return (
     <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
  );
}
