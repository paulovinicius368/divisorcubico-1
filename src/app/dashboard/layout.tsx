
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRole } from '@/hooks/use-role';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

import { Loader2, LogOut, Cuboid, Users, LayoutDashboard, UserCog, FileJson, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loadingAuth] = useAuthState(auth);
  const { role, loadingRole } = useRole(user?.uid);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace('/login');
    }
  }, [user, loadingAuth, router]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const isLoading = loadingAuth || loadingRole;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <Cuboid className="h-8 w-8 text-primary" />
             <span className="text-lg font-semibold text-primary">DivisorCubico</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/dashboard'}
                tooltip={{ children: 'Dashboard' }}
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {role === 'admin' && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/users')}
                    tooltip={{ children: 'Usuários' }}
                  >
                    <Link href="/dashboard/users">
                      <Users />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            <SidebarMenuItem>
               <SidebarMenuButton
                  asChild
                  isActive={pathname === '/dashboard/profile'}
                  tooltip={{ children: 'Meu Perfil' }}
                >
                  <Link href="/dashboard/profile">
                    <UserCog />
                    <span>Meu Perfil</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip={{children: "Sair"}}>
                    <LogOut />
                    <span>Sair</span>
                </SidebarMenuButton>
             </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between border-b p-2">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-medium">{user.displayName || user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role}</p>
                </div>
                <Button variant="outline" size="icon" onClick={handleLogout} className="h-8 w-8">
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Sair</span>
                </Button>
            </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
