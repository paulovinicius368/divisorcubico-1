"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const validatePassword = (password: string) => {
    const passwordRegex = new RegExp(
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$"
    );
    return passwordRegex.test(password);
  };

  const formatName = (name: string) => {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      toast({
        title: 'Senha Inválida',
        description: 'A senha deve ter no mínimo 8 caracteres, incluindo uma letra maiúscula, uma minúscula, um número e um caractere especial (!@#$%^&*).',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const formattedName = formatName(name);
    const formattedEmail = email.toLowerCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, password);
      await updateProfile(userCredential.user, { displayName: formattedName });
      
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
          description = 'A senha é muito fraca. O Firebase exige pelo menos 6 caracteres.';
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
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
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
              <Input
                id="password"
                type="password"
                required
                placeholder='Mínimo de 8 caracteres'
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
