
"use client";

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { doc, setDoc } from 'firebase/firestore';

type PasswordValidation = {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
};

type SignupFormProps = {
    onFinished: () => void;
}

export default function SignupForm({ onFinished }: SignupFormProps) {
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
  
  const resetForm = () => {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPasswordsMatch(null);
  }

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
    
    const { initializeApp } = await import('firebase/app');
    const { getAuth: getTempAuth } = await import('firebase/auth');
    const { getFirestore: getTempFirestore } = await import('firebase/firestore');
    
    const tempApp = initializeApp(firebaseConfig, `temp-signup-${Date.now()}`);
    const tempAuth = getTempAuth(tempApp);
    const tempDb = getTempFirestore(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, formattedEmail, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: formattedName });

      // This uses the temporary Firestore instance to create the user document,
      // which is allowed because the main app's auth state is unaffected.
      // This requires Firestore rules to allow a user to create another user's document
      // which is typically only allowed for admins in a secure backend.
      // For this client-side only app, we assume the user of this form is an admin.
      await setDoc(doc(tempDb, "users", user.uid), {
        email: formattedEmail,
        displayName: formattedName,
        role: 'user', 
        createdAt: new Date().toISOString(),
      });
      
      toast({
        title: 'Usuário criado com sucesso!',
        description: `${formattedName} foi adicionado como Usuário.`,
      });

      onFinished();

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
      const { deleteApp } = await import('firebase/app');
      deleteApp(tempApp).catch(console.error);
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
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
            <div className='flex items-center gap-4'>
                 <Button variant="outline" size="icon" className="h-8 w-8" onClick={onFinished}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Voltar</span>
                </Button>
                <div>
                    <CardTitle className="text-2xl">Adicionar Novo Usuário</CardTitle>
                    <CardDescription>Preencha os dados para criar uma nova conta de usuário.</CardDescription>
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
                placeholder="Nome completo do usuário"
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
                placeholder="usuario@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Separator />
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
              {isLoading ? <Loader2 className="animate-spin" /> : 'Criar Usuário'}
            </Button>
          </form>
        </CardContent>
      </Card>
  );
}
