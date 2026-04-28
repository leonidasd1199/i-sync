declare module "react-window" {
  import * as React from "react";

  export interface FixedSizeGridProps {
    columnCount: number;
    columnWidth: number;
    height: number;
    rowCount: number;
    rowHeight: number;
    width: number;
    children: any;
  }

  export const FixedSizeGrid: React.ComponentType<FixedSizeGridProps>;

  export interface FixedSizeListProps {
    height: number;
    itemCount: number;
    itemSize: number;
    width: number | string;
    children: any;
  }

  export const FixedSizeList: React.ComponentType<FixedSizeListProps>;
}
