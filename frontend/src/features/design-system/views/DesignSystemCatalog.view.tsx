import type { FC } from "react";
import Container from "../../../components/ui/Container";
import PageHeader from "../../../components/ui/PageHeader";
import TabNav from "../../../components/ui/TabNav";
import { SparklesIcon } from "../../../components/ui/icons/index";
import DesignSystemCatalogSections from "../components/DesignSystemCatalogSections";
import type { DesignSystemCatalogController } from "../hooks/useDesignSystemCatalog";

const SECTIONS = [
  { id: "tokens", label: "Tokens Semánticos" },
  { id: "components", label: "Catálogo Storybook" },
] as const;

/** Vista de presentación del catálogo navegable del design system. */
export const DesignSystemCatalogView: FC<DesignSystemCatalogController> = (controller) => (
  <Container className="space-y-6">
    <PageHeader
      title="Design System"
      subtitle="Tokens y catálogo certificado documentado en Storybook"
      icon={<SparklesIcon className="w-5 h-5" />}
      eyebrow="Design System"
      eyebrowIcon={<SparklesIcon className="w-3.5 h-3.5" />}
    />

    <TabNav
      tabs={SECTIONS.map((section) => ({ id: section.id, label: section.label }))}
      activeTab={controller.activeSection}
      onTabChange={controller.handleSectionChange}
      ariaLabel="Secciones del catálogo del design system"
    />

    <DesignSystemCatalogSections {...controller} />
  </Container>
);

export default DesignSystemCatalogView;
