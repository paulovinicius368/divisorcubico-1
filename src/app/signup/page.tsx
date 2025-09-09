"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Cuboid } from '@/components/icons';
import { Separator } from '@/components/ui/separator';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Cadastro realizado com sucesso!',
        description: 'Você já pode fazer login com suas credenciais.',
      });
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
        case 'auth/operation-not-allowed':
          description = 'O cadastro por e-mail e senha não está habilitado.';
          break;
        case 'auth/weak-password':
          description = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
          break;
        case 'auth/network-request-failed':
          description = 'Falha na rede. Verifique sua conexão com a internet e se o domínio está autorizado no Firebase.';
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
              <CardTitle className="text-2xl">Divisor Cúbico</CardTitle>
              <CardDescription>Crie sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
              <Input
                id="password"
                type="password"
                required
                placeholder='Mínimo de 6 caracteres'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Inscrever-se'}
            </Button>
          </form>
          <Separator className="my-4" />
          <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
            Já tem uma conta? Faça login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
