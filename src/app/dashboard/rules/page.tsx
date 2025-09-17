
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { useRole } from '@/hooks/use-role';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const firestoreRules = `
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check for admin role
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Rules for the 'allocations' collection
    match /allocations/{allocationId} {
      allow read, create, update: if request.auth != null;
      allow delete: if isAdmin();
    }

    // Rules for the 'users' collection
    match /users/{userId} {
      // Users can read their own document, Admins can read any.
      allow read: if request.auth.uid == userId || isAdmin();
      
      // Admins can list all users.
      allow list: if isAdmin();
      
      // Admins can create, update, and delete users.
      allow create, update, delete: if isAdmin();
    }
  }
}
`;

export default function FirestoreRulesPage() {
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();
  const [user, loadingAuth] = useAuthState(auth);
  const { role, loadingRole } = useRole(user?.uid);
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !loadingRole && role !== 'admin') {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [role, loadingAuth, loadingRole, router, toast]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(firestoreRules.trim());
    setHasCopied(true);
    toast({
      title: 'Copiado!',
      description: 'As regras do Firestore foram copiadas para a área de transferência.',
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (loadingAuth || loadingRole || role !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Regras do Firestore (Versão Corrigida)</CardTitle>
          <CardDescription>
            Copie e cole estas regras na aba "Regras" do seu Firestore
            Database no Console do Firebase para garantir que todas as
            permissões funcionem corretamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
              <code>{firestoreRules.trim()}</code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={copyToClipboard}
            >
              {hasCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copiar Regras</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
