// Admin-only area (roster/invites, survey & diary instruments, retention
// tooling). Phase 1 adds the role-based auth guard here.
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
