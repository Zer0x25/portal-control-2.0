import type { FC } from "react";
import tokenSource from "../../../../tokens.json";
import type { DesignSystemCatalogController } from "../hooks/useDesignSystemCatalog";
import { CERTIFIED_DESIGN_SYSTEM_STORIES } from "../certifiedStoryManifest";

const CATEGORY_LABELS = {
  primitive: "Primitivas de UI",
  "domain-component": "Modales y tablas de dominio",
  "feature-view": "Vistas de funciones",
  "layout-shell": "Shells de layout",
  foundation: "Componentes base",
  "token-gallery": "Galería de clases de tokens",
} as const;

const TOKEN_STATES = [
  { name: "success", background: "bg-token-status-success/10", text: "text-token-status-success" },
  { name: "error", background: "bg-token-status-error/10", text: "text-token-status-error" },
  { name: "warning", background: "bg-token-status-warning/10", text: "text-token-status-warning" },
  { name: "info", background: "bg-token-accent-brand/10", text: "text-token-accent-brand" },
] as const;

const CHART_SWATCHES = [
  { token: "chart-1", className: "bg-token-chart-1" },
  { token: "chart-2", className: "bg-token-chart-2" },
  { token: "chart-3", className: "bg-token-chart-3" },
  { token: "chart-4", className: "bg-token-chart-4" },
  { token: "chart-5", className: "bg-token-chart-5" },
  { token: "chart-6", className: "bg-token-chart-6" },
  { token: "chart-7", className: "bg-token-chart-7" },
  { token: "chart-8", className: "bg-token-chart-8" },
] as const;

const storybookBase =
  import.meta.env.VITE_STORYBOOK_URL?.trim() ||
  (import.meta.env.DEV ? "http://localhost:6006" : "");

const TokenSection: FC = () => (
  <div className="space-y-8">
    <section className="space-y-3">
      <div>
        <h2 className="typo-ui-title text-token-text-primary">Tokens semánticos</h2>
        <p className="text-sm text-token-text-secondary">
          Catálogo generado desde <code>tokens.json</code>. Cada muestra conserva el nombre público,
          su variable CSS y los valores de ambos temas.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tokenSource.tokens.map((token) => (
          <article
            key={token.token}
            className="flex items-center gap-3 rounded-md border border-token-border-subtle bg-token-surface-card p-3"
          >
            <span
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-sm border border-token-border-subtle"
              style={{ backgroundColor: `var(${token.cssVar})` }}
            />
            <span className="min-w-0">
              <span className="block truncate font-mono text-xs text-token-text-primary">
                {token.token}
              </span>
              <span className="block truncate font-mono text-xxs text-token-text-tertiary">
                {token.cssVar}
              </span>
              <span className="block text-xxs text-token-text-secondary">
                Claro {token.light} · Oscuro {token.dark ?? "heredado"}
              </span>
            </span>
          </article>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <div>
        <h3 className="typo-ui-title text-token-text-primary">Estados y datos</h3>
        <p className="text-sm text-token-text-secondary">
          Las clases son literales para que Tailwind genere cada variante.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {TOKEN_STATES.map((state) => (
          <span
            key={state.name}
            className={`rounded-sm border border-token-border-subtle px-3 py-2 text-xs font-bold uppercase ${state.background} ${state.text}`}
          >
            {state.name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {CHART_SWATCHES.map((swatch) => (
          <div key={swatch.token} className="space-y-1 text-center">
            <div className={`h-10 rounded-sm ${swatch.className}`} />
            <code className="text-xxs text-token-text-tertiary">{swatch.token}</code>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const CertifiedCatalog: FC = () => {
  const groups = Object.entries(CATEGORY_LABELS).map(([category, label]) => ({
    category,
    label,
    stories: CERTIFIED_DESIGN_SYSTEM_STORIES.filter((story) => story.category === category),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="typo-ui-title text-token-text-primary">Catálogo certificado</h2>
          <p className="text-sm text-token-text-secondary">
            {CERTIFIED_DESIGN_SYSTEM_STORIES.length} entradas enlazadas a sus historias de
            Storybook. El manifiesto se genera desde <code>design-system-certified.json</code>.
          </p>
        </div>
        {storybookBase ? (
          <a
            className="rounded-sm bg-token-accent-brand px-4 py-2 text-sm font-bold text-token-text-onAccent hover:brightness-110"
            href={storybookBase}
            target="_blank"
            rel="noreferrer"
          >
            Abrir Storybook
          </a>
        ) : (
          <p className="text-xs text-token-text-tertiary">
            Define <code>VITE_STORYBOOK_URL</code> para enlazar el catálogo publicado.
          </p>
        )}
      </header>

      <div className="space-y-4">
        {groups
          .filter((group) => group.stories.length > 0)
          .map((group, index) => (
            <details key={group.category} open={index === 0}>
              <summary className="cursor-pointer rounded-sm border border-token-border-subtle bg-token-surface-stripe px-4 py-3 font-bold text-token-text-primary">
                {group.label}{" "}
                <span className="text-token-text-tertiary">({group.stories.length})</span>
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {group.stories.map((story) => {
                  const storyUrl = storybookBase
                    ? `${storybookBase}/?path=/story/${story.storyId}--default`
                    : undefined;
                  return (
                    <article
                      key={story.path}
                      className="rounded-md border border-token-border-subtle bg-token-surface-card p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-bold text-token-text-primary">{story.title}</h3>
                        {storyUrl ? (
                          <a
                            className="text-xs font-bold text-token-accent-brand hover:underline"
                            href={storyUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver historia
                          </a>
                        ) : null}
                      </div>
                      <code className="mt-1 block break-all text-xxs text-token-text-tertiary">
                        {story.path}
                      </code>
                      <p className="mt-2 text-xs text-token-text-secondary">
                        {story.variants.length} variantes · {story.props.length} props ·{" "}
                        {story.tokens.length} tokens
                      </p>
                      {story.tokens.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {story.tokens.slice(0, 5).map((token) => (
                            <span
                              key={token}
                              className="rounded-sm bg-token-surface-stripe px-2 py-1 font-mono text-xxs text-token-text-secondary"
                            >
                              {token}
                            </span>
                          ))}
                          {story.tokens.length > 5 && (
                            <span className="text-xxs text-token-text-tertiary">
                              +{story.tokens.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                      {!storyUrl && (
                        <p className="mt-2 text-xxs text-token-text-tertiary">
                          Ejecuta <code>npm run storybook</code> para abrir esta historia.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </details>
          ))}
      </div>
    </div>
  );
};

const DesignSystemCatalogSections: FC<DesignSystemCatalogController> = ({ activeSection }) =>
  activeSection === "tokens" ? <TokenSection /> : <CertifiedCatalog />;

export default DesignSystemCatalogSections;
