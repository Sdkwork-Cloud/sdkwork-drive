import { CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { CapabilityUnavailablePage } from "@sdkwork/ui-mobile-react";

export function CloudDriveApp() {
  const { t } = useTranslation("drive");
  const navigate = useNavigate();

  return (
    <CapabilityUnavailablePage
      icon={CloudOff}
      message={t("unavailable")}
      onBack={() => navigate(-1)}
      title={t("title")}
    />
  );
}
