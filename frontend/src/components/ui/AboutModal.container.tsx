import React from "react";
import AboutModalView from "./AboutModal.view";
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
    />
  );
};

export default AboutModalContainer;
