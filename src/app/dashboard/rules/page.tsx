
'use client';

import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';

import { useRole } from '@/hooks/use-role';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

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
      // Admins can read, write, create, and delete any user document
      allow read, write: if isAdmin();
      
      // Authenticated users can only read their own document
      allow get: if request.auth != null && request.auth.uid == userId;
    }

    // Rules for the 'allocations' collection
    match /allocations/{allocationId} {
      // Any authenticated user can read all allocation documents
      // This is necessary for the "previous hydrometer" feature to work across users
      allow read: if request.auth != null;
      
      // Any authenticated user can create and update allocations
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
  const [copied, setCopied] = useState(false);


  if (!loadingRole && role !== 'admin') {
    router.replace('/dashboard');
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(firestoreRules.trim());
    setCopied(true);
    toast({
        title: 'Copiado!',
        description: 'As regras do Firestore foram copiadas para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Regras de Segurança do Firestore</CardTitle>
          <CardDescription>
            Copie e cole estas regras na aba &quot;Regras&quot; do seu banco de dados Firestore no Console do Firebase para garantir que o aplicativo funcione corretamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
              <code>{firestoreRules.trim()}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
