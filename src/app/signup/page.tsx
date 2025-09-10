
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Cuboid } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type PasswordValidation = {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
};

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const router = useRouter();
  const { toast } = useToast();

  const validatePassword = (password: string): boolean => {
    const validations = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*]/.test(password),
    };
    setPasswordValidation(validations);
    return Object.values(validations).every(Boolean);
  };
  
  useEffect(() => {
    validatePassword(password);
  }, [password]);

  useEffect(() => {
    if (confirmPassword.length > 0) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(null);
    }
  }, [password, confirmPassword]);


  const formatName = (name: string) => {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
        toast({
            title: 'Senhas não conferem',
            description: 'Os campos de senha e confirmação de senha devem ser iguais.',
            variant: 'destructive',
        });
        return;
    }

    if (!validatePassword(password)) {
      toast({
        title: 'Senha Inválida',
        description: 'A senha deve atender a todos os requisitos de segurança.',
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
  
  const validationCriteria = [
    { key: 'minLength', text: '8+ caracteres' },
    { key: 'hasUppercase', text: 'Maiúscula' },
    { key: 'hasLowercase', text: 'Minúscula' },
    { key: 'hasNumber', text: 'Número' },
    { key: 'hasSpecialChar', text: 'Especial' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
           <div className="flex items-center justify-center gap-3 mb-2">
            <Cuboid className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-2xl">DivisorCubico</CardTitle>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
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
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}</span>
                </Button>
              </div>
              {passwordsMatch !== null && (
                <div className={cn(
                    "flex items-center text-xs mt-1",
                    passwordsMatch ? "text-green-600" : "text-destructive"
                )}>
                  {passwordsMatch ? <CheckCircle2 className="h-3 w-3 mr-1"/> : <XCircle className="h-3 w-3 mr-1"/>}
                  {passwordsMatch ? "As senhas são iguais." : "As senhas não são iguais."}
                </div>
              )}
            </div>
             <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-medium">A senha deve conter:</span>
                {validationCriteria.map((item, index) => (
                    <span
                        key={item.key}
                        className={cn(
                            "transition-all",
                            passwordValidation[item.key as keyof PasswordValidation]
                                ? "text-green-600 line-through"
                                : "text-muted-foreground"
                        )}
                    >
                        {item.text}{index < validationCriteria.length - 1 ? ',' : ''}
                    </span>
                ))}
             </div>
            <Button type="submit" className="w-full" disabled={isLoading || !passwordsMatch}>
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
