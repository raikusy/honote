import type { Profile } from "@honote/api/schemas/profile";

declare module "@tanstack/react-router" {
  interface HistoryState {
    oneTimePassword?: string;
    provisionedProfile?: Profile;
  }
}
