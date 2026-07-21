import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useChatConversations } from '../../lib/hooks/useChatConversations';
import { formatDateLabel, formatTime, toDeviceLocalIsoString } from '../../lib/formatDate';
import { SOSButton } from '../../components/sos/SOSButton';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

/** Chat history — browse and reopen past conversations, navigates back into chat.tsx with the chosen conversationId. */
export default function ChatHistory() {
  const router = useRouter();
  const { data: conversations } = useChatConversations();
  const hasConversations = conversations.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
          <View className="mt-2 flex-row items-center">
            <Pressable onPress={() => router.back()} hitSlop={8} className="mr-2">
              <Ionicons name="chevron-back" size={24} color={colors.textDark} />
            </Pressable>
            <Text className="text-2xl font-bold text-text-dark">Chat History</Text>
          </View>

          {hasConversations ? (
            <View className="mt-4">
              {conversations.map((conversation) => {
                const lastMessageAt = toDeviceLocalIsoString(conversation.lastMessageAt);
                return (
                  <Pressable
                    key={conversation.id}
                    onPress={() => router.push({ pathname: '/(patient)/chat', params: { conversationId: conversation.id } })}
                    className="mb-3 flex-row items-center rounded-2xl bg-card p-3"
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: colors.surface }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-text-dark" numberOfLines={1}>
                        {conversation.title ?? 'New conversation'}
                      </Text>
                      <Text className="mt-0.5 text-xs text-text-muted">
                        {formatDateLabel(lastMessageAt)}, {formatTime(lastMessageAt)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="mt-8 items-center px-4">
              <Image
                source={require('../../assets/illustrations/02-two-chat-bubbles.png')}
                style={{ width: 140, height: 140 }}
                resizeMode="contain"
              />
              <Text className="mt-4 text-xl font-bold text-text-dark">No past conversations</Text>
              <Text className="mt-1 text-center text-sm text-text-muted">
                Chats you start will show up here so you can come back to them anytime.
              </Text>
            </View>
          )}
        </ScrollView>

        <SOSButton />

        <BottomTabBar active="chat" />
      </View>
    </SafeAreaView>
  );
}
