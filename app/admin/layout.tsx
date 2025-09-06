import AdminGuard from "@/components/AdminGuard";

export const metadata = { title: "Admin · Soundmind" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <AdminGuard>
        <nav className="flex gap-4 text-sm">
          <a href="/admin" className="underline">Overview</a>
          <a href="/admin/exercises" className="underline">Exercises</a>
          <a href="/admin/body-parts" className="underline">Body Parts</a>
          <a href="/admin/splits" className="underline">Splits & Mappings</a>
          <a href="/admin/users" className="underline">Users</a>
        </nav>
        {children}
      </AdminGuard>
    </div>
  );
}
