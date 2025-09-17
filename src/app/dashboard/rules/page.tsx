
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/use-role';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useEffect } from 'react';

const rulesCode = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if the requesting user is an admin
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Rules for the 'users' collection
    match /users/{userId} {
      // Admins can read and write any user document.
      allow read, write: if isAdmin();
      
      // Authenticated users can read their own document but cannot change their own role.
      allow get: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId && !('role' in request.resource.data);
    }

    // Rules for the 'allocations' collection
    match /allocations/{allocationId} {
      // Authenticated users can read all allocations.
      allow read: if request.auth != null;

      // Authenticated users can create and update allocations.
      allow create, update: if request.auth != null;
      
      // Only admins can delete allocations.
      allow delete: if isAdmin();
    }
  }
}`;

export default function RulesPage() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const { role, loadingRole } = useRole(user?.uid);
  const router = useRouter();

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

  const handleCopy = () => {
    navigator.clipboard.writeText(rulesCode.trim())
      .then(() => {
        setCopied(true);
        toast({ title: 'Código das regras copiado com sucesso!' });
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => {
        toast({ title: 'Erro ao copiar', description: 'Não foi possível copiar o código. Tente manualmente.', variant: 'destructive' });
      });
  };
  
  if (loadingRole || role !== 'admin') {
    return null; // Or a loading spinner
  }

  return (
    <div className="relative pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Regras do Firestore</CardTitle>
          <CardDescription>
            Use o botão flutuante para copiar o código abaixo e cole no editor de Regras do seu Console do Firebase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            readOnly
            value={rulesCode.trim()}
            className="h-96 font-mono text-xs bg-muted/50 resize-none"
            aria-label="Código das regras do Firestore"
          />
        </CardContent>
      </Card>
      
      <div className="fixed bottom-4 right-4 z-50 md:bottom-8 md:right-8">
        <Button 
          onClick={handleCopy} 
          size="lg"
          className="h-16 w-16 rounded-full shadow-lg"
          aria-label={copied ? "Código Copiado" : "Copiar Código"}
        >
          {copied ? <Check className="h-8 w-8" /> : <Copy className="h-8 w-8" />}
        </Button>
      </div>
    </div>
  );
}
