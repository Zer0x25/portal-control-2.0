import React from "react";
import AboutModalView from "./AboutModal.view";
import BrandLogo from "./BrandLogo";
import { useAboutModalController } from "../../hooks/layout/useAboutModalController";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModalContainer: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const controller = useAboutModalController();

  return (
    <AboutModalView
      isOpen={isOpen}
      onClose={onClose}
      showMonkey={controller.showMonkey}
      onCloseMonkey={controller.closeMonkey}
      onLogoClick={controller.handleLogoClick}
      logo={<BrandLogo className="h-20 sm:h-20 w-auto rounded-2xl shadow-2xl mx-auto" />}
    />
  );
};

export default AboutModalContainer;
