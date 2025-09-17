
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { useRole } from '@/hooks/use-role';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const rulesCode = `
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if a user is an admin
    function isAdmin(userId) {
      return exists(/databases/$(database)/documents/users/$(userId)) &&
             get(/databases/$(database)/documents/users/$(userId)).data.role == 'admin';
    }

    // Rules for the 'users' collection
    match /users/{userId} {
      // Admins can create, read, and update any user document
      allow read, create, update: if request.auth != null && isAdmin(request.auth.uid);
      
      // Admins can delete users, but not themselves
      allow delete: if request.auth != null && isAdmin(request.auth.uid) && request.auth.uid != userId;
      
      // A user can read their own document
      allow get: if request.auth != null && request.auth.uid == userId;
    }

    // Rules for the 'allocations' collection
    match /allocations/{allocationId} {
      // Any authenticated user can read all allocation documents
      allow read: if request.auth != null;
      
      // Any authenticated user can create or update allocations
      allow create, update: if request.auth != null;
      
      // Only admins can delete allocations
      allow delete: if request.auth != null && isAdmin(request.auth.uid);
    }
  }
}
`;

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
        toast({ title: 'Código copiado!' });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        toast({ title: 'Erro ao copiar', description: 'Não foi possível copiar o código.', variant: 'destructive' });
      });
  };
  
  if (loadingRole || role !== 'admin') {
    return null; // Or a loading spinner
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras do Firestore</CardTitle>
        <CardDescription>
          Copie este código e cole no editor de Regras do Firestore no seu Console do Firebase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Textarea
            readOnly
            value={rulesCode.trim()}
            className="h-96 font-mono text-xs bg-muted/50 resize-none"
            aria-label="Código das regras do Firestore"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={handleCopy}
            aria-label="Copiar código"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
         <Button onClick={handleCopy} className="w-full">
           {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
           Copiar Código
         </Button>
      </CardContent>
    </Card>
  );
}
