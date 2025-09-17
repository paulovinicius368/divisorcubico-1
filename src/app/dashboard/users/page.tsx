
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRole } from '@/hooks/use-role';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, Trash2, UserPlus, Shield, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import SignupForm from './_components/signup-form';

type AppUser = {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
};

export default function UsersPage() {
  const [currentUser] = useAuthState(auth);
  const { role: currentUserRole, loadingRole } = useRole(currentUser?.uid);
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<AppUser | null>(null);

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

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as AppUser[];
      setUsers(usersData);
      setLoadingUsers(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro ao buscar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive"
      })
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [currentUserRole]);

  const handleDeleteUser = async () => {
    if (!deleteCandidate) return;

    // This is a placeholder. Deleting a user requires an Admin SDK on a backend.
    // For now, we'll just delete the Firestore doc.
    try {
      await deleteDoc(doc(db, 'users', deleteCandidate.uid));
      // IMPORTANT: The cloud function to delete the auth user is not implemented.
      // This will only remove them from the app's user list, not from Firebase Auth.
      toast({
        title: 'Usuário Removido (Apenas do App)',
        description: `O usuário ${deleteCandidate.email} foi removido da lista. A conta de autenticação ainda existe.`,
        variant: 'destructive',
      });
      setDeleteCandidate(null);
    } catch (error) {
      toast({
        title: 'Erro ao Remover',
        description: `Não foi possível remover o usuário.`,
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async (uid: string, newRole: 'admin' | 'user') => {
     try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast({
        title: 'Permissão Alterada',
        description: `O usuário agora é ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao Alterar Permissão',
        description: 'Não foi possível atualizar o nível de acesso do usuário.',
        variant: 'destructive',
      });
    }
  };


  if (loadingRole || currentUserRole !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showAddUser) {
    return <SignupForm onFinished={() => setShowAddUser(false)} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Gerenciamento de Usuários</CardTitle>
            <CardDescription>Adicione, remova e gerencie os níveis de acesso dos usuários.</CardDescription>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="mr-2" />
            Adicionar Usuário
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingUsers ? (
           <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.displayName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={user.uid === currentUser?.uid}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         {user.role === 'user' ? (
                          <DropdownMenuItem onClick={() => handleChangeRole(user.uid, 'admin')}>
                            <Shield className="mr-2 h-4 w-4" />
                            Tornar Admin
                          </DropdownMenuItem>
                         ) : (
                           <DropdownMenuItem onClick={() => handleChangeRole(user.uid, 'user')}>
                             <User className="mr-2 h-4 w-4" />
                             Tornar Usuário
                           </DropdownMenuItem>
                         )}
                         <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500" onClick={() => setDeleteCandidate(user)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
        <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o usuário <span className="font-bold">{deleteCandidate?.email}</span> do sistema de permissões.
              Para exclusão completa e segura (incluindo autenticação), é necessário usar o Firebase Admin SDK em um ambiente de servidor (Cloud Function), o que não está implementado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCandidate(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className={cn(buttonVariants({variant: "destructive"}))}>
              Sim, Excluir do App
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

    

    