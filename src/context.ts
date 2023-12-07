import React from 'react';
import { Animated } from 'react-native';

export type ImageHeaderContextType = {
  scrollY: Animated.Value;
  scrollPageY: number;
};

export const ImageHeaderContext = React.createContext<ImageHeaderContextType>({
  scrollY: new Animated.Value(0),
  scrollPageY: 0,
});
