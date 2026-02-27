const columns = [
  { title: "New", items: ["Emma & Luke", "Hannah enquiry"] },
  { title: "Discovery", items: ["Olivia & Mark"] },
  { title: "Booked", items: ["Sophie wedding"] },
];

export default function LeadsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">Board view is the primary organiser for leads.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <section key={column.title} className="rounded-xl border border-black/10 bg-zinc-50 p-3">
            <h2 className="text-sm font-semibold text-zinc-900">{column.title}</h2>
            <div className="mt-3 space-y-2">
              {column.items.map((item) => (
                <article key={item} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-700">
                  {item}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
