
"use client";

import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Cuboid } from '@/components/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// This page is for creating the very first user.
// After the first admin is created, this page should ideally be disabled again.
export default function PublicSignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const formatName = (name: string) => {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formattedName = formatName(name);
    const formattedEmail = email.toLowerCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: formattedName });
      
      // Create user role document in Firestore with 'user' role by default.
      // This needs to be manually changed to 'admin' in Firestore for the first user.
      await setDoc(doc(db, "users", user.uid), {
        email: formattedEmail,
        displayName: formattedName,
        role: 'user', 
        createdAt: new Date().toISOString(),
      });
      
      toast({
        title: 'Conta criada com sucesso!',
        description: `Agora você pode fazer login. Para se tornar admin, seu acesso precisa ser liberado no banco de dados.`,
      });
      
      await auth.signOut();
      router.push('/login');

    } catch (error: any) {
      let description = `Ocorreu um erro desconhecido. Código: ${error.code}`;
      switch (error.code) {
        case 'auth/email-already-in-use':
          description = 'Este endereço de e-mail já está em uso por outra conta.';
          break;
        case 'auth/invalid-email':
          description = 'O formato do endereço de e-mail não é válido.';
          break;
        case 'auth/weak-password':
          description = 'A senha é muito fraca. Tente uma senha mais forte.';
          break;
        default:
          console.error("Erro no cadastro:", error);
          break;
      }
      
      toast({
        title: 'Erro no Cadastro',
        description: description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
     <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
           <div className="flex items-center justify-center gap-3 mb-2">
            <Cuboid className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-2xl">DivisorCubico</CardTitle>
              <CardDescription>Crie a sua conta inicial</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
             <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
               <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</span>
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
            </Button>
             <p className="px-8 text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Fazer Login
                </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
