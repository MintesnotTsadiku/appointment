import type { ComponentType, CSSProperties } from "react";

import type { ResolvedMode } from "../firstPaint";
import type { PublishedSnapshot } from "../types";

export interface TemplateProps {
  snapshot: PublishedSnapshot;
  locale: string;
  applicationName: string;
  publicRoot: string;
  rootStyle: CSSProperties;
  mode: ResolvedMode;
  toggleMode: () => void;
}

export interface BookingTemplateProps extends TemplateProps {
  bookingPath?: string | null;
}

export interface ContentTemplateProps extends TemplateProps {
  content: import("../contentContract").ContentState;
  contentRoot: string;
}

export interface PublicTemplatePackage {
  key: string;
  Site: ComponentType<TemplateProps>;
  Booking: ComponentType<BookingTemplateProps>;
  Content: ComponentType<ContentTemplateProps>;
}
