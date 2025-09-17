
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRole } from '@/hooks/use-role';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
  
    // Helper function to check for admin role
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Rules for the 'users' collection
    match /users/{userId} {
      // Admins can create, read, update, and delete any user document
      allow create, read, update, delete: if isAdmin();
      
      // A non-admin user can only read their own document
      allow get: if request.auth.uid == userId;
    }

    // Rules for the 'allocations' collection
    match /allocations/{allocationId} {
      // Any authenticated user can read all allocation documents
      allow read: if request.auth != null;
      
      // Any authenticated user can create or update allocations
      allow create, update: if request.auth != null;
      
      // Only admins can delete allocations
      allow delete: if isAdmin();
    }
  }
}
`;


export default function RulesPage() {
  const [user] = useAuthState(auth);
  const { role, loadingRole } = useRole(user?.uid);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loadingRole && role !== 'admin') {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [role, loadingRole, router, toast]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(firestoreRules.trim());
    toast({
      title: 'Copiado!',
      description: 'As regras do Firestore foram copiadas para a área de transferência.',
    });
  };

  if (loadingRole || role !== 'admin') {
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
          <CardTitle>Regras de Segurança do Firestore</CardTitle>
          <CardDescription>
            Copie e cole estas regras na aba &quot;Regras&quot; do seu banco de dados Firestore no Console do Firebase para garantir o funcionamento correto do aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Instruções</AlertTitle>
                <AlertDescription>
                    1. Clique no botão &quot;Copiar Regras&quot; abaixo. <br/>
                    2. Abra o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline">Console do Firebase</a> e navegue até seu projeto. <br/>
                    3. Vá para <strong>Firestore Database</strong> &gt; <strong>Regras</strong>. <br/>
                    4. Substitua todo o conteúdo existente por este novo código e clique em <strong>Publicar</strong>.
                </AlertDescription>
            </Alert>

            <pre className="p-4 rounded-md bg-muted text-sm overflow-x-auto">
              <code>
                {firestoreRules.trim()}
              </code>
            </pre>

            <Button onClick={copyToClipboard} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copiar Regras
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
