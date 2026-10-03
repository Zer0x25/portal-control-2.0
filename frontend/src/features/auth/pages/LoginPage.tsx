import React, { useState } from "react";
import { User } from "../../../types/index";
import { useAuth } from "../../../hooks/useAuth";
import { useControlInternoEnabledQuery } from "../../../hooks/queries/useConfigQuery";
import { useToasts } from "../../../hooks/useToasts";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Card from "../../../components/ui/Card";
import SimpleConnectionIndicator from "../../../components/ui/SimpleConnectionIndicator";
import { APP_TITLE, ROUTES } from "../../../constants";
import { Link, useNavigate } from "react-router-dom";
import LiberalitasSignature from "../../../components/LiberalitasSignature";
import { getDefaultRouteForRole } from "../../../utils/routeUtils";
import logoImg from "../../../assets/images/Mini_Zer0x.jpg";
import { motion } from "framer-motion";
import MFALoginModal from "../components/MFALoginModal";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, currentUser, mfaRequired, logout } = useAuth();
  const { data: isControlInternoEnabled = true } = useControlInternoEnabledQuery();
  const { addToast } = useToasts();
  const navigate = useNavigate();

  // Handle session restore: auto-redirect if already authenticated at root
  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
      const redirectPath = getDefaultRouteForRole(currentUser.role, isControlInternoEnabled);
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, isControlInternoEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await login(username, password);
      if (response && !("mfaRequired" in response && response.mfaRequired)) {
        const user = response as User;
        const redirectPath = getDefaultRouteForRole(user.role, isControlInternoEnabled);
        addToast(`¡Bienvenido, ${user.username}!`, "success");
        navigate(redirectPath, { replace: true });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error de conexión con el servidor";
      addToast(errorMessage, "error");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = () => {
    if (currentUser) {
      const redirectPath = getDefaultRouteForRole(currentUser.role, isControlInternoEnabled);
      addToast(`¡Bienvenido, ${currentUser.username}!`, "success");
      navigate(redirectPath);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-token-surface-stripe p-6 overflow-hidden relative selection:bg-sap-blue/30 selection:text-sap-blue">
      {/* Crystal Clear Spotlight Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-token-surface-stripe">
        {/* Main Spotlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.08)_0%,transparent_70%)] z-0" />

        {/* Inner Glow behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sap-blue/10 rounded-full blur-[120px] z-0" />

        {/* Technical Grid - Pure CSS & Sharp */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-50"></div>

        {/* Edge Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] opacity-70"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[380px] z-10 perspective-1000"
      >
        <Card
          noPadding
          className="overflow-hidden bg-token-surface-card md:backdrop-blur-2xl border border-token-border-subtle shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative group rounded-3xl"
        >
          {/* Top colored line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-sap-blue to-transparent opacity-50"></div>

          <div className="px-8 py-10 sm:px-10 sm:py-8 relative z-10">
            {/* Header Section */}
            <div className="text-center mb-10 sm:mb-8">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mb-8 sm:mb-6 relative inline-block group-hover:scale-105 transition-transform duration-500"
              >
                <div className="absolute inset-0 bg-sap-blue rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                <img
                  src={logoImg}
                  alt="Logo"
                  className="h-20 sm:h-16 w-auto relative z-10 rounded-2xl shadow-2xl"
                />
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <h1 className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-linear-to-r from-token-text-primary via-sap-blue to-sap-light-blue uppercase tracking-[0.2em] mb-1">
                  {APP_TITLE}
                </h1>
                <div className="flex items-center justify-center gap-2 opacity-60">
                  <div className="h-px w-8 bg-linear-to-r from-transparent to-token-text-primary/50"></div>
                  <LiberalitasSignature className="text-[10px] tracking-[0.3em] text-token-text-primary" />
                  <div className="h-px w-8 bg-linear-to-l from-transparent to-token-text-primary/50"></div>
                </div>
              </motion.div>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-5">
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <div className="group/input relative">
                  <label htmlFor="username" className="sr-only">
                    Usuario
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="USUARIO"
                    autoComplete="username"
                    className="bg-token-surface-stripe border-token-border-subtle text-token-text-primary placeholder:text-token-text-tertiary rounded-xl px-4 py-3.5 focus:border-sap-blue focus:bg-token-surface-active focus:ring-1 focus:ring-sap-blue/20 transition-all font-bold text-sm tracking-wide"
                  />
                  <div className="absolute inset-0 rounded-xl border border-token-border-subtle pointer-events-none"></div>
                </div>

                <div className="group/input relative">
                  <label htmlFor="password" className="sr-only">
                    Contraseña
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="CONTRASEÑA"
                    autoComplete="current-password"
                    className="bg-token-surface-stripe border-token-border-subtle text-token-text-primary placeholder:text-token-text-tertiary rounded-xl px-4 py-3.5 focus:border-sap-blue focus:bg-token-surface-active focus:ring-1 focus:ring-sap-blue/20 transition-all font-bold text-sm tracking-wide"
                  />
                  <div className="absolute inset-0 rounded-xl border border-token-border-subtle pointer-events-none"></div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full h-12 rounded-xl bg-sap-blue text-white hover:brightness-110 border-none font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-sap-blue/30 flex items-center justify-center gap-2 group/btn relative overflow-hidden transition-all duration-300"
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>

                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="opacity-80 font-black uppercase tracking-widest text-[10px] text-white">
                        Verificando...
                      </span>
                    </div>
                  ) : (
                    <>
                      <span>ACCEDER AL PORTAL</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300 opacity-70"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.5a.75.75 0 010 1.08l-5.5 5.5a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div
              className="text-center mt-6 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <Link
                to={ROUTES.KIOSK}
                className="group inline-flex flex-col items-center gap-2 py-2 px-4 rounded-lg hover:bg-token-surface-active transition-colors"
              >
                <span className="text-[10px] font-black bg-clip-text text-transparent bg-linear-to-r from-sap-blue via-sap-light-blue to-token-text-primary uppercase tracking-[0.25em] transition-all">
                  Acceder como Kiosko
                </span>
                <div className="h-px w-0 bg-sap-blue group-hover:w-full transition-all duration-300"></div>
              </Link>
            </motion.div>
          </div>
        </Card>
      </motion.div>

      {/* Footer Status */}
      <motion.div
        className="fixed bottom-6 left-6 z-20"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <div className="bg-token-surface-card backdrop-blur-md border border-token-border-subtle px-4 py-2 rounded-full shadow-lg hover:bg-token-surface-active transition-colors cursor-default">
          <SimpleConnectionIndicator />
        </div>
      </motion.div>

      <MFALoginModal isOpen={mfaRequired} onSuccess={handleMFASuccess} onCancel={logout} />

      <motion.div
        className="fixed bottom-6 right-6 z-20 text-[10px] font-mono text-token-text-tertiary pointer-events-none select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        v3.0.0-RC1
      </motion.div>
    </div>
  );
};

export default LoginPage;
