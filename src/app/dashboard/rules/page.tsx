
'use client';

import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { useRole } from '@/hooks/use-role';
import { Loader2, Copy } from 'lucide-react';

const firestoreRules = `rules_version = '2';

// Visit https://firebase.google.com/docs/rules/rules-language#understanding_rules
// to learn more about Firestore Security Rules.
service cloud.firestore {
  match /databases/{database}/documents {
  
    // Helper function to check if a user is an admin
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Rules for the 'users' collection
    match /users/{userId} {
      // ANY authenticated user can read ANY user document.
      // This is necessary for the isAdmin() check to work in other rules.
      // The user documents only contain public info like name, email, and role.
      allow read: if request.auth != null;
      
      // ONLY admins can list, create, update, or delete users.
      allow list, update, delete, create: if isAdmin();
    }

    // Rules for the 'allocations' collection
    match /allocations/{allocationId} {
      // ANY authenticated user can read, create, and update allocation documents.
      // Read is needed for reports and previous meter lookups.
      // Create/Update is needed for daily entries.
      allow read, create, update: if request.auth != null;
      
      // ONLY admins can delete allocation documents.
      allow delete: if isAdmin();
    }
  }
}`;

export default function RulesPage() {
  const [user] = useAuthState(auth);
  const { role, loadingRole } = useRole(user?.uid);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loadingRole && role !== 'admin') {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para visualizar esta página.',
        variant: 'destructive',
      });
      router.replace('/dashboard');
    }
  }, [role, loadingRole, router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(firestoreRules);
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
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Regras Finais do Firestore</CardTitle>
        <CardDescription>
          Copie este código e cole nas regras do seu Firestore no Console do
          Firebase para corrigir os problemas de permissão.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          readOnly
          value={firestoreRules}
          className="h-[500px] font-mono text-xs bg-muted/30"
          aria-label="Código das regras do Firestore"
        />
        <Button onClick={handleCopy} className="w-full">
          <Copy className="mr-2 h-4 w-4" />
          Copiar Regras
        </Button>
      </CardContent>
    </Card>
  );
}
