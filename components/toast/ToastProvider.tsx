import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Animated, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

type ToastType = 'error' | 'success';

interface ToastApi {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DISMISS_MS = 3500;

// Reuses the existing risk-band tokens — an error toast is the same red as a
// high-risk band, a success toast the same green as a low-risk one. No new
// palette entries.
const STYLES: Record<ToastType, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  error: { bg: colors.riskHighBg, text: colors.riskHighText, icon: 'alert-circle' },
  success: { bg: colors.riskLowBg, text: colors.riskLowText, icon: 'checkmark-circle' },
};

/**
 * App-wide toast, mounted at the ROOT layout (outside both route groups) so
 * patient and doctor screens share one instance.
 *
 * Placed at the TOP of the screen deliberately: the bottom edge is already
 * claimed on nearly every screen by BottomTabBar/DoctorTabBar and, on patient
 * screens, the floating SOSButton (absolute, bottom-32 right-5). A bottom
 * toast would sit on top of one or the other.
 *
 * One toast at a time — a second showToast() replaces the first and restarts
 * the timer, rather than stacking. These fire on discrete user actions that
 * can't realistically overlap.
 * ponytail: single slot, not a queue — add a queue only if a real screen
 * turns out to fire two toasts at once.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = 'error') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, type });

      opacity.setValue(0);
      translateY.setValue(-20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setToast(null);
        });
      }, DISMISS_MS);
    },
    [opacity, translateY]
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const style = toast ? STYLES[toast.type] : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View className="flex-1">
        {children}

        {toast && style ? (
          // pointerEvents="none" — the toast never swallows a tap meant for
          // the screen underneath it.
          <Animated.View
            pointerEvents="none"
            className="absolute left-4 right-4 flex-row items-center rounded-2xl px-4 py-3 shadow-lg"
            style={{
              top: insets.top + 8,
              backgroundColor: style.bg,
              opacity,
              transform: [{ translateY }],
            }}
          >
            <Ionicons name={style.icon} size={20} color={style.text} />
            <Text className="ml-2 flex-1 text-sm font-medium" style={{ color: style.text }}>
              {toast.message}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
