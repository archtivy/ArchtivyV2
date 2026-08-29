/**
 * The sidebar card shell: thin neutral border, generous padding, one heading
 * treatment. Shared by every panel in the project detail sidebar so the column
 * reads as one system rather than five separately-styled boxes.
 *
 * RailPanel (components/entity/RelationshipRail) is deliberately not reused
 * here: it is bound to the relationship-rail idea and its own heading scale,
 * and the product detail page still depends on it unchanged.
 */
export function SidebarCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-hairline bg-cream p-5 ${className}`}>
      {title && (
        <h2 className="mb-4 font-body text-[15px] text-ink">{title}</h2>
      )}
      {children}
    </section>
  );
}
