
'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRole } from '@/hooks/use-role';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import UserManagementTable from './_components/users-table';
import SignupForm from './_components/signup-form';

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function UsersPage() {
  const [currentUser, loadingAuth] = useAuthState(auth);
  const { role: currentUserRole, loadingRole } = useRole(currentUser?.uid);
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showSignupForm, setShowSignupForm] = useState(false);

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

  useEffect(() => {
    if (currentUserRole !== 'admin') return;

    setLoadingUsers(true);
    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersData: UserData[] = [];
        snapshot.forEach((doc) => {
          usersData.push({ uid: doc.id, ...doc.data() } as UserData);
        });
        setUsers(usersData);
        setLoadingUsers(false);
      },
      (error) => {
        console.error('Failed to fetch users:', error);
        toast({
          title: 'Erro ao Carregar Usuários',
          description:
            'Não foi possível buscar a lista de usuários. Verifique as permissões do Firestore.',
          variant: 'destructive',
        });
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserRole]);

  const isLoading = loadingAuth || loadingRole;

  if (isLoading || currentUserRole !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showSignupForm) {
    return <SignupForm onFinished={() => setShowSignupForm(false)} />;
  }

  return (
    <UserManagementTable
      users={users}
      isLoading={loadingUsers}
      onAddUser={() => setShowSignupForm(true)}
    />
  );
}
