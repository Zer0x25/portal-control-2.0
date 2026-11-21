import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ROW_ARCHIVED_CLASS,
  ROW_BASE_CLASS,
  ROW_HOVER_CLASS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "./listTokens";

const TOKEN_CLASSES = [
  ROW_BASE_CLASS,
  ROW_HOVER_CLASS,
  ROW_ARCHIVED_CLASS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
];
const TokenClassGallery = () => (
  <div className="space-y-3">
    {TOKEN_CLASSES.map((className) => (
      <div key={className} className={className}>
        <code className="rounded bg-token-surface-card px-2 py-1 text-xs">{className}</code>
        <span className="ml-3 text-sm text-token-text-primary">Ejemplo de fila teórica</span>
      </div>
    ))}
  </div>
);

const meta = {
  id: "certified-features-theoretical-shifts-components-list-tokens",
  title: "Design System/features/theoretical-shifts/components/list/Tokens",
  component: TokenClassGallery,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Galería de las clases exportadas por listTokens.ts; el origen es un diccionario, no un componente React.",
      },
    },
  },
} satisfies Meta<typeof TokenClassGallery>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const RowStatesComparison: Story = {
  render: () => (
    <div className="space-y-2 p-2">
      <div
        className={`${ROW_BASE_CLASS} ${ROW_HOVER_CLASS} p-3 rounded border border-token-border-subtle`}
      >
        <span className={TEXT_PRIMARY}>Fila activa con hover tokenizado</span>
        <span className={`ml-3 ${TEXT_SECONDARY}`}>Estado normal</span>
      </div>
      <div
        className={`${ROW_BASE_CLASS} ${ROW_ARCHIVED_CLASS} p-3 rounded border border-token-border-subtle`}
      >
        <span className={TEXT_PRIMARY}>Fila archivada</span>
        <span className={`ml-3 ${TEXT_SECONDARY}`}>Estado atenuado</span>
      </div>
    </div>
  ),
};
