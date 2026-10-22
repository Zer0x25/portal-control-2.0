import type { FC } from "react";
import Container from "../../../components/ui/Container";
import PageHeader from "../../../components/ui/PageHeader";
import TabNav from "../../../components/ui/TabNav";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import { SparklesIcon } from "../../../components/ui/icons/index";
import DesignSystemCatalogSections from "../components/DesignSystemCatalogSections";
import type { DesignSystemCatalogController } from "../hooks/useDesignSystemCatalog";

const SECTIONS = [
  { id: "tokens", label: "Tokens Semánticos" },
  { id: "components", label: "Formularios & Botones" },
  { id: "cards", label: "Tarjetas & Analítica" },
  { id: "feedback", label: "Feedback & Diálogos" },
] as const;

/** Vista de presentación del catálogo navegable del design system. */
export const DesignSystemCatalogView: FC<DesignSystemCatalogController> = (controller) => (
  <Container className="space-y-6">
    <PageHeader
      title="Design System"
      subtitle="Catálogo navegable de primitivas, tokens y patrones del Portal Control"
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

    {controller.isTestConfirmOpen && (
      <ConfirmationModal
        isOpen={controller.isTestConfirmOpen}
        onClose={() => controller.setIsTestConfirmOpen(false)}
        onConfirm={() => {
          controller.addToast("Acción confirmada desde el catálogo", "success");
          controller.setIsTestConfirmOpen(false);
        }}
        title="Prueba de Diálogo"
        message="Este es un diálogo ConfirmationModal utilizando tokens semánticos y soporte accesible de Escape."
        confirmText="Ejecutar"
        confirmVariant="primary"
      />
    )}
  </Container>
);

export default DesignSystemCatalogView;
