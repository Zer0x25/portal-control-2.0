import React, { type ComponentProps } from "react";
import type CorrectionRequestModalContainer from "./CorrectionRequestModal.container";

type CorrectionRequestModalProps = ComponentProps<typeof CorrectionRequestModalContainer>;

const LazyCorrectionRequestModal = React.lazy(() => import("./CorrectionRequestModal.container"));

const CorrectionRequestModal: React.FC<CorrectionRequestModalProps> = (props) => (
  <React.Suspense fallback={null}>
    <LazyCorrectionRequestModal {...props} />
  </React.Suspense>
);

export default CorrectionRequestModal;
