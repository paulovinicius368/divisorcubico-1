import CubeSplitterApp from "@/components/cube-splitter-app";
import { useAdmin } from "./layout";

export default function DashboardPage() {
  const { isAdmin, isClaimsLoading } = useAdmin();

  return (
    <main>
      <CubeSplitterApp isAdmin={isAdmin} isClaimsLoading={isClaimsLoading} />
    </main>
  );
}
