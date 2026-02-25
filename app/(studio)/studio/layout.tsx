import type { ReactNode } from "react";

type StudioRootLayoutProps = {
  children: ReactNode;
};

export default function StudioRootLayout({ children }: StudioRootLayoutProps) {
  return children;
}
