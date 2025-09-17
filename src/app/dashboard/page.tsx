
'use client';

import CubeSplitterApp from "@/components/cube-splitter-app";
import { useRole } from "@/hooks/use-role";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const { role, loadingRole } = useRole(user?.uid);

  if (loadingAuth || loadingRole) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <CubeSplitterApp userRole={role} />;
}

    