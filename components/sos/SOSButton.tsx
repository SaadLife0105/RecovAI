import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { colors } from '../../constants/theme';
import { CrisisResourcesModal } from '../modals/CrisisResourcesModal';

/** Floating SOS button, persistent across patient screens. Opens the Crisis Resources sheet. */
export function SOSButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="absolute bottom-32 right-5 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: colors.riskHigh }}
      >
        <Text className="text-xs font-bold text-white">SOS</Text>
      </Pressable>

      <CrisisResourcesModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
