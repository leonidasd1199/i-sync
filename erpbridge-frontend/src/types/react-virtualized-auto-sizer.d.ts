declare module "react-virtualized-auto-sizer" {
  import * as React from "react";

  interface AutoSizerProps {
    children: (size: { height: number; width: number }) => React.ReactNode;
  }

  const AutoSizer: React.FC<AutoSizerProps>;
  export default AutoSizer;
}
