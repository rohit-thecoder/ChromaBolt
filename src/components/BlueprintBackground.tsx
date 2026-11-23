import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Pattern, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { palette } from '@/theme/theme';

interface BlueprintBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** An anodized workbench surface with a non-interactive technical drawing overlay. */
export function BlueprintBackground({
  children,
  style,
}: BlueprintBackgroundProps): React.JSX.Element {
  return (
    <View style={[styles.container, style]}>
      <Svg
        pointerEvents="none"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 180">
        <Defs>
          <LinearGradient id="anodized-vignette" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#141920" />
            <Stop offset="0.52" stopColor={palette.workbenchSurface} />
            <Stop offset="1" stopColor="#141920" />
          </LinearGradient>
          <Pattern height="8" id="blueprint-grid" patternUnits="userSpaceOnUse" width="8">
            <Path d="M 8 0 L 0 0 0 8" fill="none" stroke={palette.blueprintGrid} strokeWidth="0.35" />
          </Pattern>
        </Defs>
        <Rect fill="url(#anodized-vignette)" height="180" width="100" x="0" y="0" />
        <Rect fill="url(#blueprint-grid)" height="180" width="100" x="0" y="0" />
        <Path d="M 3 11 V 3 H 11 M 89 3 H 97 V 11 M 3 169 V 177 H 11 M 89 177 H 97 V 169" fill="none" stroke={palette.steel} strokeWidth="0.5" />
        <Line stroke={palette.steel} strokeDasharray="1 2" strokeWidth="0.25" x1="8" x2="92" y1="14" y2="14" />
        <Line stroke={palette.steel} strokeDasharray="1 2" strokeWidth="0.25" x1="8" x2="92" y1="166" y2="166" />
        {[12, 24, 36, 48, 60, 72, 84].map((x) => <Line key={`top-${x}`} stroke={palette.steel} strokeWidth="0.45" x1={x} x2={x} y1="2" y2="4" />)}
        {[25, 50, 75, 100, 125, 150].map((y) => <Line key={`side-${y}`} stroke={palette.steel} strokeWidth="0.45" x1="2" x2="4" y1={y} y2={y} />)}
        <Path d="M 46 90 H 54 M 50 86 V 94" fill="none" stroke={palette.steel} strokeOpacity="0.6" strokeWidth="0.35" />
        <Path d="M 8 38 H 25 M 75 38 H 92 M 8 142 H 25 M 75 142 H 92" stroke={palette.blueprintGrid} strokeWidth="2.4" />
        <SvgText fill={palette.steel} fontSize="2.4" letterSpacing="0.55" x="9" y="11">
          CHROMABOLT // PRECISION SORTING BAY
        </SvgText>
        <SvgText fill={palette.steel} fontSize="2.1" letterSpacing="0.35" textAnchor="end" x="91" y="174">
          SCALE 1:1 • mm
        </SvgText>
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.workbenchSurface,
    flex: 1,
    overflow: 'hidden',
  },
});

