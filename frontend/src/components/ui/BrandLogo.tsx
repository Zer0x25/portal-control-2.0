import React from "react";
import logoFallback from "../../assets/images/Mini_Zer0x.jpg";
import type { BrandLogo as BrandLogoValue } from "../../services/configService";
import { useBrandLogoQuery } from "../../hooks/queries/useConfigQuery";

interface BrandLogoProps {
  className?: string;
}

/**
 * Logo de marca configurable (spec 027, Opción A).
 * Lee la configuración pública sin autenticación; ante ausencia o fallo
 * usa el asset empaquetado con sus dimensiones intrínsecas (anti-CLS).
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ className = "" }) => {
  const { data } = useBrandLogoQuery();
  const configured: BrandLogoValue | null =
    data?.source?.ref && Number.isInteger(data.width) && Number.isInteger(data.height)
      ? data
      : null;

  if (!configured) {
    return (
      <img
        src={logoFallback}
        alt="Logo"
        width={512}
        height={188}
        fetchPriority="high"
        decoding="async"
        className={className}
      />
    );
  }

  const src =
    configured.source.kind === "upload" ? (configured.url ?? logoFallback) : configured.source.ref;
  return (
    <img
      src={src}
      alt="Logo"
      width={configured.width}
      height={configured.height}
      style={{ width: configured.width, height: configured.height }}
      fetchPriority="high"
      decoding="async"
      className={className}
      onError={(event) => {
        // Remoto caído o inválido: fallback local sin romper el login (una sola vez).
        const target = event.currentTarget;
        if (target.dataset.fallback !== "true") {
          target.dataset.fallback = "true";
          target.src = logoFallback;
          target.width = 512;
          target.height = 188;
          target.style.width = "512px";
          target.style.height = "188px";
        }
      }}
    />
  );
};

export default BrandLogo;
