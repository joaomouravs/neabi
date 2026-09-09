import Link from "next/link";

import { AdminPage, AdminSection, StatCard } from "@/components/admin/admin-ui";
import { reservationStatusLabels } from "@/config/catalog";
import { requirePermission } from "@/server/auth/session";
import {
  getCategoryDistribution,
  getDashboardMetrics,
  getEmptySearches,
  getMostViewedBooks,
  getReservationsByStatus,
  getTopSearches,
} from "@/server/repositories/analytics-repository";

export default async function AdminAnalyticsPage() {
  await requirePermission("analytics:read");

  const [metrics, mostViewed, topSearches, emptySearches, byStatus, categories] =
    await Promise.all([
      getDashboardMetrics(),
      getMostViewedBooks(10, 30),
      getTopSearches(12, 30),
      getEmptySearches(12, 90),
      getReservationsByStatus(),
      getCategoryDistribution(),
    ]);

  const totalReservations = byStatus.reduce((sum, row) => sum + row.count, 0);
  const maxCategoryCount = Math.max(
    1,
    ...categories.map((category) => category.bookCount),
  );

  return (
    <AdminPage
      title="Analytics"
      description="Uso do acervo nos últimos 30 dias. Buscas sem resultado cobrem 90 dias."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Visualizações (30 dias)"
          value={metrics.viewsLast30Days}
          hint={`${metrics.views} no total`}
        />
        <StatCard label="Obras publicadas" value={metrics.publishedBooks} />
        <StatCard label="Reservas registradas" value={totalReservations} />
        <StatCard
          label="Obras a revisar"
          value={metrics.needsReview}
          tone={metrics.needsReview > 0 ? "amber" : "neutral"}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <AdminSection
          title="Obras mais acessadas"
          description="Visualizações registradas nos últimos 30 dias."
        >
          {mostViewed.length === 0 ? (
            <p className="py-4 text-[0.875rem] text-ink-500">
              Nenhuma visualização registrada no período.
            </p>
          ) : (
            <ol className="flex flex-col divide-y divide-border">
              {mostViewed.map((book, index) => (
                <li
                  key={book.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="w-5 shrink-0 text-right font-mono text-[0.75rem] text-ink-400">
                    {index + 1}
                  </span>
                  <Link
                    href={`/acervo/${book.slug}`}
                    className="line-clamp-1 min-w-0 flex-1 text-[0.875rem] text-ink-800 hover:text-neabi-red-700"
                  >
                    {book.title}
                  </Link>
                  <span className="shrink-0 tabular-nums text-[0.8125rem] font-medium text-ink-900">
                    {book.periodViews}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>

        <AdminSection
          title="Termos mais buscados"
          description="O que a comunidade procura no acervo."
        >
          {topSearches.length === 0 ? (
            <p className="py-4 text-[0.875rem] text-ink-500">
              Nenhuma busca registrada no período.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {topSearches.map((search) => (
                <li
                  key={search.normalizedQuery}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`/acervo?q=${encodeURIComponent(search.query)}`}
                    className="line-clamp-1 min-w-0 flex-1 text-[0.875rem] text-ink-800 hover:text-neabi-red-700"
                  >
                    {search.query}
                  </Link>
                  <span className="shrink-0 text-[0.75rem] text-ink-500">
                    {search.lastResultCount} resultado
                    {search.lastResultCount === 1 ? "" : "s"}
                  </span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-[0.8125rem] font-medium text-ink-900">
                    {search.searches}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Buscas sem resultado"
          description="Sinal direto de lacunas no acervo ou na catalogação."
        >
          {emptySearches.length === 0 ? (
            <p className="py-4 text-[0.875rem] text-ink-500">
              Nenhuma busca sem resultado nos últimos 90 dias.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {emptySearches.map((search) => (
                <li
                  key={search.query}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="line-clamp-1 text-[0.875rem] text-ink-800">
                    {search.query}
                  </span>
                  <span className="shrink-0 tabular-nums text-[0.8125rem] text-ink-500">
                    {search.searches}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title="Reservas por situação">
          <ul className="flex flex-col divide-y divide-border">
            {byStatus.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/admin/reservas?status=${row.status}`}
                  className="text-[0.875rem] text-ink-800 hover:text-neabi-red-700"
                >
                  {reservationStatusLabels[row.status]}
                </Link>
                <span className="tabular-nums text-[0.875rem] font-medium text-ink-900">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>

        <AdminSection
          title="Distribuição por categoria"
          description="Obras publicadas em cada eixo do acervo."
          className="xl:col-span-2"
        >
          <ul className="flex flex-col gap-2.5">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-3">
                <span className="w-52 shrink-0 truncate text-[0.875rem] text-ink-800">
                  {category.name}
                </span>
                <span className="h-4 flex-1 bg-neabi-cream-200">
                  <span
                    className="block h-full bg-neabi-green"
                    style={{
                      width: `${(category.bookCount / maxCategoryCount) * 100}%`,
                    }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-[0.8125rem] font-medium text-ink-900">
                  {category.bookCount}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      </div>
    </AdminPage>
  );
}
