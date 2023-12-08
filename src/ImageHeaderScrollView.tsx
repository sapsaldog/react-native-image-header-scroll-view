import React, {
  forwardRef,
  FunctionComponent,
  MutableRefObject,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Dimensions,
  ImageSourcePropType,
  ScrollViewProps,
  ImageStyle,
  TextStyle,
  ViewStyle,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { ImageHeaderContext, ImageHeaderContextType } from './context';

type Props = React.PropsWithChildren<
  ScrollViewProps & {
    childrenStyle?: ViewStyle | TextStyle | ImageStyle;
    overlayColor?: string;
    foregroundParallaxRatio?: number; // defaults to 1
    maxHeight?: number; // default is 80
    minHeight?: number; // default is 125
    maxOverlayOpacity?: number; // defaults to 0.3
    minOverlayOpacity?: number; // defaults to 0
    renderFixedForeground?: React.FC;
    renderForeground?: React.FC;
    renderHeader?: React.FC;
    foregroundExtrapolate?: 'clamp' | 'extend' | 'identity' | undefined;
    renderTouchableFixedForeground?: React.FC;
    ScrollViewComponent?: React.ElementType<ScrollViewProps>;
    scrollViewBackgroundColor?: string;
    headerImage?: ImageSourcePropType;
    useNativeDriver?: boolean; // defaults to false.
    headerContainerStyle?: object;
    fixedForegroundContainerStyles?: object;
    disableHeaderGrow?: boolean;
  }
>;

export const ImageHeaderScrollView: FunctionComponent<Props> = forwardRef(
  (
    {
      overlayColor = 'black',
      disableHeaderGrow = false,
      foregroundParallaxRatio = 1,
      maxHeight = 125,
      maxOverlayOpacity = 0.3,
      minHeight = 80,
      minOverlayOpacity = 0,
      renderFixedForeground = () => <View />,
      foregroundExtrapolate = 'clamp',
      renderHeader: renderHeaderProps = () => <View />,
      ScrollViewComponent: ScrollViewComponentProps = ScrollView,
      scrollViewBackgroundColor = 'white',
      childrenStyle,
      style,
      contentContainerStyle,
      useNativeDriver,
      headerContainerStyle,
      headerImage,
      fixedForegroundContainerStyles,
      renderTouchableFixedForeground: renderTouchableFixedForegroundProps,
      renderForeground: renderForegroundProps,
      onScroll: onScrollProps,
      ...scrollViewProps
    },
    ref
  ) => {
    const scrollY = useRef(new Animated.Value(0)).current;
    const [pageY, setPageY] = useState(0);
    const containerRef = useRef<MutableRefObject<View>>(null).current;
    const scrollViewRef = useRef<MutableRefObject<ScrollView>>(null).current;

    useImperativeHandle(ref, () => ({
      getChildContext: () => {
        return {
          scrollY,
          scrollPageY: pageY + minHeight,
        };
      },
    }));
    const interpolateOnImageHeight = (outputRange: number[]) => {
      const headerScrollDistance = maxHeight - minHeight;
      return scrollY.interpolate({
        inputRange: [0, headerScrollDistance],
        outputRange,
        extrapolate: 'clamp',
      });
    };

    const Header = () => {
      if (headerImage) {
        return (
          <Image
            source={headerImage}
            style={{
              height: maxHeight,
              width: Dimensions.get('window').width,
            }}
          />
        );
      }
      return renderHeaderProps({});
    };

    const renderHeader = () => {
      const overlayOpacity = interpolateOnImageHeight([minOverlayOpacity, maxOverlayOpacity]);

      const headerScale = scrollY.interpolate({
        inputRange: [-maxHeight, 0],
        outputRange: [3, 1],
        extrapolate: 'clamp',
      });

      const headerTransformStyle = {
        height: maxHeight,
        transform: !disableHeaderGrow ? [{ scale: headerScale }] : undefined,
      };

      const overlayStyle = [
        styles.overlay,
        { opacity: overlayOpacity, backgroundColor: overlayColor },
      ];

      const disableOverlay = minOverlayOpacity === maxOverlayOpacity && maxOverlayOpacity === 0;

      return (
        <Animated.View style={[styles.header, headerTransformStyle, headerContainerStyle]}>
          {Header()}
          {!disableOverlay && <Animated.View style={overlayStyle} />}
          <View style={[styles.fixedForeground, fixedForegroundContainerStyles]}>
            {renderFixedForeground({})}
          </View>
        </Animated.View>
      );
    };

    const renderForeground = () => {
      const headerTranslate = scrollY.interpolate({
        inputRange: [0, maxHeight * 2],
        outputRange: [0, -maxHeight * 2 * foregroundParallaxRatio],
        extrapolate: foregroundExtrapolate,
      });

      const headerTransformStyle = {
        height: maxHeight,
        transform: [{ translateY: headerTranslate }],
      };

      if (!renderForegroundProps) {
        return <View />;
      }

      return (
        <Animated.View style={[styles.header, headerTransformStyle]}>
          {renderForegroundProps({})}
        </Animated.View>
      );
    };

    const renderTouchableFixedForeground = () => {
      const height = interpolateOnImageHeight([maxHeight, minHeight]);

      if (!renderTouchableFixedForegroundProps) {
        return <View />;
      }

      if (useNativeDriver) {
        if (__DEV__) {
          console.warn(
            'useNativeDriver=true and renderTouchableFixedForeground is not supported at the moment due to the animation of height unsupported with the native driver'
          );
        }
        return null;
      }

      return (
        <Animated.View style={[styles.header, styles.touchableFixedForeground, { height }]}>
          {renderTouchableFixedForegroundProps({})}
        </Animated.View>
      );
    };

    const onContainerLayout = () => {
      if (!containerRef) {
        return;
      }
      containerRef.current.measureInWindow((_x, y) => {
        if (containerRef) {
          setPageY(y);
        }
      });
    };

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (onScrollProps) {
        onScrollProps(e);
      }
      scrollY.setValue(e.nativeEvent.contentOffset.y);
    };

    const ScrollViewComponent = useNativeDriver ? Animated.ScrollView : ScrollViewComponentProps;

    const inset = maxHeight - minHeight;

    const contextValue: ImageHeaderContextType = useMemo(() => {
      return {
        scrollY,
        scrollPageY: pageY + minHeight,
      };
    }, [scrollY, pageY, minHeight]);

    return (
      <ImageHeaderContext.Provider value={contextValue}>
        <View
          style={[
            styles.container,
            {
              paddingTop: minHeight,
              backgroundColor: scrollViewBackgroundColor,
            },
          ]}
          ref={containerRef}
          onLayout={onContainerLayout}
        >
          {renderHeader()}
          <ScrollViewComponent
            scrollEventThrottle={useNativeDriver ? 1 : 16}
            ref={scrollViewRef}
            overScrollMode="never"
            {...scrollViewProps}
            contentContainerStyle={[
              {
                backgroundColor: scrollViewBackgroundColor,
                marginTop: inset,
                paddingBottom: inset,
              },
              contentContainerStyle,
              childrenStyle,
            ]}
            style={[styles.container, style]}
            onScroll={
              useNativeDriver
                ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                    useNativeDriver: true,
                  })
                : onScroll
            }
          />
          {renderTouchableFixedForeground()}
          {renderForeground()}
        </View>
      </ImageHeaderContext.Provider>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  fixedForeground: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    zIndex: 101,
  },
  touchableFixedForeground: {
    zIndex: 102,
  },
});
