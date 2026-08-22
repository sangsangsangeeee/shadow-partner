import React from 'react';
import Svg, { Circle, Path, Rect } from '@granite-js/native/react-native-svg';

/**
 * 웹판이 쓰던 lucide-react를 react-native-svg로 옮긴 것.
 * lucide와 같은 24x24 그리드, stroke-width 2, round cap/join.
 */

export interface IconProps {
  size?: number;
  color?: string;
  /** 아이콘 전용 버튼에는 접근성 라벨이 필요하다. 보통은 버튼 쪽에 단다. */
  opacity?: number;
}

export type Icon = (props: IconProps) => React.ReactElement;

function Frame({ size = 20, color = '#ffffff', opacity, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    >
      {children}
    </Svg>
  );
}

export const Play: Icon = (p) => (
  <Frame {...p}>
    <Path d="M6 3 20 12 6 21 Z" />
  </Frame>
);

export const Pause: Icon = (p) => (
  <Frame {...p}>
    <Rect x={14} y={4} width={4} height={16} rx={1} />
    <Rect x={6} y={4} width={4} height={16} rx={1} />
  </Frame>
);

export const SquareIcon: Icon = (p) => (
  <Frame {...p}>
    <Rect x={3} y={3} width={18} height={18} rx={2} />
  </Frame>
);

export const SkipForward: Icon = (p) => (
  <Frame {...p}>
    <Path d="M5 4 15 12 5 20 Z" />
    <Path d="M19 5v14" />
  </Frame>
);

export const Trash2: Icon = (p) => (
  <Frame {...p}>
    <Path d="M3 6h18" />
    <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <Path d="M10 11v6" />
    <Path d="M14 11v6" />
  </Frame>
);

export const Volume2: Icon = (p) => (
  <Frame {...p}>
    <Path d="M11 5 6 9H2v6h4l5 4V5Z" />
    <Path d="M16 9a5 5 0 0 1 0 6" />
    <Path d="M19.36 5.64a9 9 0 0 1 0 12.72" />
  </Frame>
);

export const Check: Icon = (p) => (
  <Frame {...p}>
    <Path d="M20 6 9 17l-5-5" />
  </Frame>
);

export const Pencil: Icon = (p) => (
  <Frame {...p}>
    <Path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.63l4.36-1.33a2 2 0 0 0 .83-.5Z" />
    <Path d="m15 5 4 4" />
  </Frame>
);

export const X: Icon = (p) => (
  <Frame {...p}>
    <Path d="M18 6 6 18" />
    <Path d="m6 6 12 12" />
  </Frame>
);

export const RotateCcw: Icon = (p) => (
  <Frame {...p}>
    <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <Path d="M3 3v5h5" />
  </Frame>
);

export const Plus: Icon = (p) => (
  <Frame {...p}>
    <Path d="M5 12h14" />
    <Path d="M12 5v14" />
  </Frame>
);

export const Minus: Icon = (p) => (
  <Frame {...p}>
    <Path d="M5 12h14" />
  </Frame>
);

export const MoreHorizontal: Icon = (p) => (
  <Frame {...p}>
    <Circle cx={12} cy={12} r={1} />
    <Circle cx={19} cy={12} r={1} />
    <Circle cx={5} cy={12} r={1} />
  </Frame>
);

export const SettingsIcon: Icon = (p) => (
  <Frame {...p}>
    <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
    <Circle cx={12} cy={12} r={3} />
  </Frame>
);

export const ChevronUp: Icon = (p) => (
  <Frame {...p}>
    <Path d="m18 15-6-6-6 6" />
  </Frame>
);

export const LayoutGrid: Icon = (p) => (
  <Frame {...p}>
    <Rect x={3} y={3} width={7} height={7} rx={1} />
    <Rect x={14} y={3} width={7} height={7} rx={1} />
    <Rect x={14} y={14} width={7} height={7} rx={1} />
    <Rect x={3} y={14} width={7} height={7} rx={1} />
  </Frame>
);

export const Timer: Icon = (p) => (
  <Frame {...p}>
    <Path d="M10 2h4" />
    <Path d="M12 14 15 11" />
    <Circle cx={12} cy={14} r={8} />
  </Frame>
);

export const ListOrdered: Icon = (p) => (
  <Frame {...p}>
    <Path d="M11 5h10" />
    <Path d="M11 12h10" />
    <Path d="M11 19h10" />
    <Path d="M4 4h1v5" />
    <Path d="M4 9h2" />
    <Path d="M4 16a2 2 0 1 1 3.4 1.4L4 20h4" />
  </Frame>
);

export const AlertCircle: Icon = (p) => (
  <Frame {...p}>
    <Circle cx={12} cy={12} r={10} />
    <Path d="M12 8v4" />
    {/* round cap이라 길이 0의 선이 점으로 그려진다. lucide가 쓰는 방식. */}
    <Path d="M12 16h.01" />
  </Frame>
);

export const Megaphone: Icon = (p) => (
  <Frame {...p}>
    <Path d="m3 11 18-5v12L3 14v-3Z" />
    <Path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </Frame>
);
