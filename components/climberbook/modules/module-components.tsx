import type { ComponentType } from "react";
import type { ModuleKey } from "@/components/climberbook/common/modules";
import { TrainingModule } from "./training/TrainingModule";
import { ReportsModule } from "./reports/ReportsModule";
import { AnalyticsModule } from "./analytics/AnalyticsModule";
import { ModelsModule } from "./models/ModelsModule";
import { TeamModule } from "./team/TeamModule";
import { FacilitiesModule } from "./facilities/FacilitiesModule";
import { SettingsModule } from "./settings/SettingsModule";
export const moduleComponents: Record<ModuleKey, ComponentType> = {
  treningowy: TrainingModule,
  raportowy: ReportsModule,
  analityka: AnalyticsModule,
  modele: ModelsModule,
  team: TeamModule,
  obiekty: FacilitiesModule,
  ustawienia: SettingsModule,
};
