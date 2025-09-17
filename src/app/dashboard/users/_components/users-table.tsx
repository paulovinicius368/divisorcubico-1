
'use client';

import { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserData } from '../page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  UserPlus,
  Trash2,
  UserCog,
  Loader2,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface UserManagementTableProps {
  users: UserData[];
  isLoading: boolean;
  onAddUser: () => void;
}

export default function UserManagementTable({
  users,
  isLoading,
  onAddUser,
}: UserManagementTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'user') => {
    setUpdatingId(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      toast({
        title: 'Sucesso!',
        description: `O usuário agora é ${
          newRole === 'admin' ? 'um Administrador' : 'um Usuário'
        }.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar a permissão do usuário.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingId) return;

    // Note: This only deletes the Firestore document, not the Auth user.
    // Deleting the Auth user requires a backend environment (e.g., Cloud Functions).
    const idToDelete = deletingId;
    setDeletingId(null); // Close dialog immediately

    try {
      await deleteDoc(doc(db, 'users', idToDelete));
      toast({
        title: 'Documento de usuário removido',
        description:
          'O registro do usuário no banco de dados foi removido. O usuário ainda existe na Autenticação.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error deleting user document:', error);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o documento do usuário.',
        variant: 'destructive',
      });
    }
  };

  const renderSkeleton = () => (
    [...Array(5)].map((_, i) => (
       <TableRow key={`skeleton-${i}`}>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
      </TableRow>
    ))
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Adicione, remova e altere permissões de usuários.
              </CardDescription>
            </div>
            <Button onClick={onAddUser} className='w-full sm:w-auto'>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? renderSkeleton() : users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">
                      {user.displayName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={cn(
                          user.role === 'admin' && 'bg-primary/20 text-primary-foreground border-primary/40 hover:bg-primary/30',
                          user.role === 'user' && 'bg-muted text-muted-foreground border-muted-foreground/20'
                        )}
                      >
                         {user.role === 'admin' ? (
                          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <Shield className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.createdAt
                        ? format(new Date(user.createdAt), 'dd/MM/yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {updatingId === user.uid ? (
                        <Loader2 className="h-5 w-5 animate-spin ml-auto" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.role === 'user' ? (
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(user.uid, 'admin')}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                Tornar Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(user.uid, 'user')}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                Tornar Usuário
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-500 focus:bg-red-50"
                              onClick={() => setDeletingId(user.uid)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {!isLoading && users.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    <p>Nenhum usuário encontrado na base de dados.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o registro de permissões do usuário do banco
              de dados. O usuário ainda existirá no sistema de autenticação, mas
              pode perder o acesso a certas funcionalidades. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className={cn(Button, 'bg-destructive hover:bg-destructive/90')}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
