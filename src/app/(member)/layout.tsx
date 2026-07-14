// Member-facing area (ranked feed, weight settings, cross-member viewing,
// instrument responses). Phase 1 adds the auth guard here.
export default function MemberLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
