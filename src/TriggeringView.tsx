import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { View, Animated, ViewProps, LayoutChangeEvent } from 'react-native';

import { useImageHeaderContext } from './use-image-header-context';

interface Props extends ViewProps {
  onBeginHidden?: Function;
  onHide?: Function;
  onBeginDisplayed?: Function;
  onDisplay?: Function;
  onTouchTop?: Function;
  onTouchBottom?: Function;
  topOffset?: number;
  bottomOffset?: number;
}

export const TriggeringView: FunctionComponent<Props> = ({
  topOffset = 0,
  bottomOffset = 0,
  onDisplay,
  onBeginDisplayed,
  onHide,
  onBeginHidden,
  onTouchBottom,
  onTouchTop,
  children,
  ...viewProps
}) => {
  const [initialPageY, setInitialPageY] = useState(0);
  const ref = useRef<View>();
  const [touched, setTouched] = useState(false);
  const [hidden, setHidden] = useState(false);

  const context = useImageHeaderContext();

  const [height, setHeight] = useState(0);

  const handleOnLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const layout = e.nativeEvent.layout;
      setHeight(layout.height);

      ref.current?.measure((_x, _y, _width, _height, _pageX, pageY) => {
        setInitialPageY(pageY);
      });
    },
    [ref, setHeight, setInitialPageY]
  );

  const triggerEvents = useCallback(
    (value: number, top: number, bottom: number) => {
      if (!touched && value >= top + topOffset) {
        setTouched(true);
        onBeginHidden && onBeginHidden();
        onTouchTop && onTouchTop(true);
      } else if (touched && value < top + topOffset) {
        setTouched(false);

        onDisplay && onDisplay();
        onTouchTop && onTouchTop(false);
      }

      if (!hidden && value >= bottom + bottomOffset) {
        setHidden(true);
        onHide && onHide();
        onTouchBottom && onTouchBottom(true);
      } else if (hidden && value < bottom + bottomOffset) {
        setHidden(false);
        onBeginDisplayed && onBeginDisplayed();
        onTouchBottom && onTouchBottom(false);
      }
    },
    [touched, hidden, topOffset, bottomOffset]
  );

  const onScroll: Animated.ValueListenerCallback = useCallback(
    (event) => {
      if (!context.scrollPageY) {
        return;
      }
      const pageY = initialPageY - event.value;
      triggerEvents(context.scrollPageY, pageY, pageY + height);
    },
    [context.scrollPageY, initialPageY, height, triggerEvents]
  );

  useEffect(() => {
    if (!context.scrollY) {
      return;
    }
    const listenerId = context.scrollY.addListener(onScroll);

    return () => {
      context.scrollY.removeListener(listenerId);
    };
  }, [context.scrollY, height, onScroll]);

  return (
    <View ref={ref} collapsable={false} {...viewProps} onLayout={handleOnLayout}>
      {children}
    </View>
  );
};
