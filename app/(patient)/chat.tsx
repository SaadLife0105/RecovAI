import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/hooks/useSession';
import { useChatMessages } from '../../lib/hooks/useChatMessages';
import { useSendChatMessage } from '../../lib/hooks/useSendChatMessage';
import { formatTime, toDeviceLocalIsoString } from '../../lib/formatDate';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';
import { CrisisResourcesModal } from '../../components/modals/CrisisResourcesModal';
import { getRandomSupportDisclaimer } from '../../lib/supportDisclaimers';
import type { ChatMessage } from '../../lib/types';

const STARTER_SUGGESTIONS = ['Hi', "I'm having a craving", "I'm not feeling great today", 'Just checking in'];

/** Screen 21/39 — Chat. Wired to the deployed rag-chat Edge Function (Phase 4.2/4.3). */
export default function Chat() {
  const router = useRouter();
  // Arriving from chat-history.tsx with a past conversation's id loads it
  // immediately. Arriving with none (the Chat tab) resumes the patient's most
  // recent conversation instead — see the one-shot effect below.
  const { conversationId: initialConversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const { session, isLoading: sessionLoading } = useSession();
  const patientId = session?.user.id;
  const [supportDisclaimer] = useState(getRandomSupportDisclaimer);

  // Opening the Chat tab used to land on a blank compose screen, which meant a
  // proactive message the risk-agent had sent into "RecovAI Check-ins" was
  // invisible unless the patient happened to open the history list and find it
  // (confirmed on-device 2026-07-21). Resuming the most recent conversation —
  // whichever it is, no special-casing by title — puts it in front of them.
  //
  // Deliberately ONE-SHOT and ref-guarded, not keyed off `conversationId`:
  // handleNewChat() also sets conversationId back to undefined, and re-running
  // this then would snap straight back to the old conversation and make that
  // button do nothing.
  const resumeAttempted = useRef(false);
  const [resumeChecked, setResumeChecked] = useState(!!initialConversationId);

  useEffect(() => {
    if (resumeAttempted.current || initialConversationId || sessionLoading) return;
    resumeAttempted.current = true;

    if (!patientId) {
      setResumeChecked(true); // no session to look anything up with
      return;
    }

    supabase
      .from('chat_conversations')
      .select('id')
      .eq('patient_id', patientId)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setConversationId(data.id);
        setResumeChecked(true);
      });
  }, [patientId, sessionLoading, initialConversationId]);

  const { data: messages, refetch } = useChatMessages(conversationId);
  const { sendMessage, isSending, error: sendError } = useSendChatMessage();

  const [draft, setDraft] = useState('');
  // Optimistic patient bubbles (temp ids) shown instantly, before the round trip.
  const [optimistic, setOptimistic] = useState<ChatMessage[]>([]);
  // Once a turn flags a crisis, the banner stays for the rest of the session.
  // Reopening a past conversation, or starting a New Chat, does not try to
  // reconstruct historical crisis state — this is local, current-session-only
  // state, which is a reasonable simplification rather than a gap.
  const [crisisActive, setCrisisActive] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  const allMessages = [...messages, ...optimistic];
  const hasMessages = allMessages.length > 0;
  // "Start a conversation" must only appear once we KNOW there's nothing to
  // resume — otherwise it flashes for a moment and then snaps to a resumed
  // conversation, which reads as broken. Blank is fine for that instant.
  const showEmptyState = !hasMessages && resumeChecked && !conversationId;

  const scrollRef = useRef<ScrollView>(null);
  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  // Under Android 15 edge-to-edge (targetSdkVersion 35), windowSoftInputMode
  // "adjustResize" no longer shrinks the window automatically for the IME, and
  // react-native-safe-area-context's insets.bottom does NOT track the keyboard
  // on this device either (confirmed on-device: it stays constant at the
  // system nav-bar inset regardless of keyboard state) — both ruled out by
  // direct testing on 2026-07-20, not assumption. What DOES work, confirmed
  // the same way: the RN Keyboard module's show/hide events fire reliably
  // here with a correct height, even though the automatic resize doesn't
  // apply itself. So on Android, keyboard height is tracked in state from
  // those events and applied manually as margin on the input row; iOS keeps
  // using KeyboardAvoidingView's automatic 'padding' behavior as before.
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  // Measured at runtime rather than hardcoded — keyboardDidShow's height is
  // measured from the screen's true bottom edge, but the input row was never
  // actually touching the bottom (BottomTabBar sits below it), so lifting by
  // the full keyboard height over-shifts by exactly the tab bar's height,
  // leaving a gap (confirmed on-device 2026-07-20). Subtracting the tab bar's
  // real rendered height corrects this without a fragile guessed constant.
  const [tabBarHeight, setTabBarHeight] = useState(0);
  // Full keyboard height, minus the space already reclaimed by the tab bar
  // being covered, plus the system nav-bar inset sitting below the tab bar
  // (not part of the tab bar's own measured height). Confirmed correct
  // on-device 2026-07-20 with real numbers: keyboardHeight 343.47,
  // tabBarHeight 64.71, insets.bottom 14.93 → androidLift 293.69, input sits
  // cleanly above the keyboard with no gap and no overlap.
  const insets = useSafeAreaInsets();
  const androidLift = Math.max(0, androidKeyboardHeight - tabBarHeight + insets.bottom);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setAndroidKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Keep the latest message visible as the keyboard opens. New messages (real
  // or optimistic) and the typing indicator grow the content, so
  // onContentSizeChange covers those + initial load; this effect covers the
  // keyboard-open/close case specifically, on both platforms.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', scrollToEnd);
    return () => sub.remove();
  }, []);
  useEffect(() => {
    scrollToEnd();
  }, [androidLift]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      patientId: '',
      sender: 'patient',
      text: trimmed,
      createdAt: toDeviceLocalIsoString(new Date().toISOString()),
    };
    setOptimistic((prev) => [...prev, optimisticMsg]);
    setDraft(''); // clear immediately — don't make them wait to see their own message

    const result = await sendMessage(trimmed, conversationId);

    if (result) {
      if (result.crisisFlag) setCrisisActive(true);
      // First message of a fresh conversation — capture the id rag-chat just
      // assigned so subsequent sends in this screen session continue it.
      if (!conversationId && result.conversationId) setConversationId(result.conversationId);
      await refetch(); // pull the real user row + assistant reply from the DB
      setOptimistic((prev) => prev.filter((m) => m.id !== tempId)); // drop the temp bubble
    } else {
      // Send failed: remove the optimistic bubble and restore the draft so
      // the patient doesn't lose what they typed.
      setOptimistic((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(trimmed);
    }
  }

  // Resets to the empty "Start a conversation" state — server-side data is
  // untouched, this only clears local screen state. The next message sent
  // will have rag-chat create a fresh chat_conversations row.
  function handleNewChat() {
    setConversationId(undefined);
    setOptimistic([]);
    setCrisisActive(false);
    setDraft('');
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        {/* iOS lifts the input above the keyboard via KAV 'padding'. Android is
            NOT handled here — under Android 15 edge-to-edge, adjustResize is
            broken and KAV's automatic behavior depends on the same broken
            resize, so behavior is undefined (KAV is an inert wrapper on
            Android) and the input row's marginBottom={androidKeyboardHeight}
            does the lift instead, driven by real Keyboard module event
            heights (see the hook above — confirmed working on-device, unlike
            adjustResize or safe-area-context's insets, both ruled out first).
            SOSButton (absolute) and BottomTabBar (in-flow) stay OUTSIDE the KAV
            so on iOS they stay pinned to the screen bottom under the keyboard. */}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
        <View className="mt-2 flex-row items-center justify-between px-5">
          <View>
            <Text className="text-lg font-bold text-text-dark">RecovAI Chat</Text>
            <View className="mt-0.5 flex-row items-center">
              <View className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: colors.riskLow }} />
              <Text className="text-xs text-text-muted">Online</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable onPress={handleNewChat} accessibilityLabel="Start a new chat" hitSlop={12}>
              <Ionicons name="create-outline" size={22} color={colors.textDark} />
            </Pressable>
            <Pressable onPress={() => router.push('/(patient)/chat-history')} accessibilityLabel="View chat history" hitSlop={12}>
              <Ionicons name="time-outline" size={22} color={colors.textDark} />
            </Pressable>
          </View>
        </View>

        {crisisActive ? (
          <View
            className="mx-5 mt-3 flex-row items-center rounded-2xl p-3"
            style={{ backgroundColor: colors.riskHighBg }}
          >
            <Ionicons name="heart" size={18} color={colors.riskHigh} />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-bold" style={{ color: colors.riskHighText }}>
                Need help right now?
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: colors.riskHighText }}>
                You&apos;re not alone — support is available anytime.
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCrisisModal(true)}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.riskHigh }}
            >
              <Text className="text-[11px] font-bold text-white">Get support</Text>
            </Pressable>
          </View>
        ) : null}

        {hasMessages ? (
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerClassName="px-5 py-4"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
          >
            {allMessages.map((message) => {
              const isPatient = message.sender === 'patient';
              return (
                <View key={message.id} className={`mb-3 flex-row ${isPatient ? 'justify-end' : 'justify-start'}`}>
                  {!isPatient ? (
                    <View className="mr-2 h-7 w-7 self-end rounded-full" style={{ backgroundColor: colors.primary }} />
                  ) : null}
                  <View style={{ maxWidth: '75%' }}>
                    <View
                      className="rounded-2xl px-4 py-2.5"
                      style={{ backgroundColor: isPatient ? colors.primary : colors.card }}
                    >
                      <Text className="text-sm" style={{ color: isPatient ? '#FFFFFF' : colors.textDark }}>
                        {message.text}
                      </Text>
                    </View>
                    <View className={`mt-1 flex-row items-center ${isPatient ? 'justify-end' : 'justify-start'}`}>
                      <Text className="text-[10px] text-text-muted">{formatTime(message.createdAt)}</Text>
                      {isPatient && message.read ? (
                        <Ionicons name="checkmark-done" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}

            {isSending ? (
              <View className="mb-3 flex-row justify-start">
                <View className="mr-2 h-7 w-7 self-end rounded-full" style={{ backgroundColor: colors.primary }} />
                <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: colors.card }}>
                  <View className="flex-row items-center">
                    <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.textMuted }} />
                    <View className="ml-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.textMuted }} />
                    <View className="ml-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.textMuted }} />
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>
        ) : !showEmptyState ? (
          <View className="flex-1" />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Image
              source={require('../../assets/illustrations/02-two-chat-bubbles.png')}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
            <Text className="mt-4 text-center text-xl font-bold text-text-dark">Start a conversation</Text>
            <Text className="mt-1 text-center text-sm text-text-muted">
              Type a message below, or try one of the suggestions.
            </Text>
          </View>
        )}

        {showEmptyState ? (
          <View style={{ height: 44 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}
            >
              {STARTER_SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => handleSend(suggestion)}
                  disabled={isSending}
                  className="mr-2 rounded-full border px-4 py-2"
                  style={{ borderColor: colors.divider, opacity: isSending ? 0.5 : 1 }}
                >
                  <Text className="text-xs font-medium" style={{ color: colors.textDark }}>
                    {suggestion}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {sendError ? (
          <View className="px-5 pb-1">
            <Text className="text-xs" style={{ color: colors.riskHigh }}>
              {sendError}
            </Text>
          </View>
        ) : null}

        <Text className="px-5 pt-2 text-xs" style={{ color: colors.textMuted }}>
          {supportDisclaimer}
        </Text>

        <View
          className="flex-row items-center border-t border-divider px-5 py-3"
          style={{ marginBottom: androidLift }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            className="flex-1 rounded-full bg-card px-4 py-2.5 text-sm text-text-dark"
            onSubmitEditing={() => handleSend(draft)}
            editable={!isSending}
          />
          <Pressable
            onPress={() => handleSend(draft)}
            disabled={isSending}
            accessibilityLabel="Send message"
            hitSlop={8}
            className="ml-2 h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.primary, opacity: isSending ? 0.5 : 1 }}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
        </KeyboardAvoidingView>

        <SOSButton />

        <View onLayout={(e) => setTabBarHeight(e.nativeEvent.layout.height)}>
          <BottomTabBar active="chat" />
        </View>
      </View>

      <CrisisResourcesModal visible={showCrisisModal} onClose={() => setShowCrisisModal(false)} />
    </SafeAreaView>
  );
}
